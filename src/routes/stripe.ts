import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase';

const PLANS: Record<string, { amount: number; credits: number; name: string }> = {
  starter: { amount: 1000, credits: 3, name: 'Starter (3 credits)' },
  bestvalue: { amount: 5000, credits: 20, name: 'Best Value (20 credits)' },
  business: { amount: 10000, credits: 50, name: 'Business (50 credits)' },
};

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for a one-time credit purchase.
 * Body: { user_email, plan }
 */
export async function createCheckoutHandler(req: Request, res: Response) {
  try {
    const { user_email, plan } = req.body;

    if (!user_email || !plan) {
      return res.status(400).json({ success: false, error: 'user_email and plan are required' });
    }

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ success: false, error: 'Invalid plan. Must be starter, bestvalue, or business' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `PDF to Video — ${planConfig.name}` },
            unit_amount: planConfig.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_email,
        credits: String(planConfig.credits),
        plan,
      },
      customer_email: user_email,
      success_url: `${frontendUrl}?payment=success`,
      cancel_url: `${frontendUrl}/#pricing`,
    });

    console.log(`[stripe] Checkout session created for ${user_email}, plan: ${plan}`);
    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('[stripe] Checkout error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events. Must receive raw body for signature verification.
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.metadata?.user_email;
    const credits = Number(session.metadata?.credits || 0);
    const stripeSessionId = session.id;

    if (!userEmail || !credits) {
      console.error('[stripe] Webhook missing metadata:', session.metadata);
      return res.status(200).json({ received: true });
    }

    try {
      const supabase = getSupabase();

      // Idempotency check: skip if this session was already processed
      const { data: existingTx } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('stripe_session_id', stripeSessionId)
        .maybeSingle();

      if (existingTx) {
        console.log(`[stripe] Duplicate webhook for session ${stripeSessionId}, skipping`);
        return res.status(200).json({ received: true });
      }

      // Get current balance
      const { data: existing } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_email', userEmail)
        .maybeSingle();

      const currentBalance = existing ? Number(existing.balance) : 0;
      const newBalance = currentBalance + credits;

      // Upsert credits
      const { error: upsertError } = await supabase
        .from('user_credits')
        .upsert(
          { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
          { onConflict: 'user_email' }
        );

      if (upsertError) {
        console.error('[stripe] Credit upsert error:', upsertError);
        return res.status(500).json({ error: 'Failed to add credits' });
      }

      // Record transaction
      await supabase.from('credit_transactions').insert({
        user_email: userEmail,
        amount: credits,
        balance_after: newBalance,
        type: 'purchase',
        description: `Purchased ${session.metadata?.plan} plan`,
        stripe_session_id: stripeSessionId,
      });

      console.log(`[stripe] Added ${credits} credits to ${userEmail}. New balance: ${newBalance}`);
    } catch (err) {
      console.error('[stripe] Webhook processing error:', err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  return res.status(200).json({ received: true });
}
