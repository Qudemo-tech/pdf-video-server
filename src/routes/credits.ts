import { Request, Response } from 'express';
import { getSupabase } from '../lib/supabase';

/**
 * GET /api/credits?email=...
 * Get credit balance for a user.
 */
export async function getCreditsHandler(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query param is required' });
    }

    const { data, error } = await getSupabase()
      .from('user_credits')
      .select('balance')
      .eq('user_email', email)
      .maybeSingle();

    if (error) {
      console.error('[credits] Get error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, balance: data ? Number(data.balance) : 0 });
  } catch (err) {
    console.error('[credits] Get exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
}

/**
 * GET /api/credits/check?email=...
 * Check if user has enough credits to start a video (>= 1).
 */
export async function checkCreditsHandler(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query param is required' });
    }

    const { data, error } = await getSupabase()
      .from('user_credits')
      .select('balance')
      .eq('user_email', email)
      .maybeSingle();

    if (error) {
      console.error('[credits] Check error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const balance = data ? Number(data.balance) : 0;
    return res.json({ success: true, hasCredits: balance >= 1, balance });
  } catch (err) {
    console.error('[credits] Check exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to check credits' });
  }
}

/**
 * POST /api/credits/deduct
 * Deduct credits after video generation. Balance can go negative.
 * Body: { user_email, amount, video_session_id?, description? }
 */
export async function deductCreditsHandler(req: Request, res: Response) {
  try {
    const { user_email, amount, video_session_id, description } = req.body;

    if (!user_email || amount == null) {
      return res.status(400).json({ success: false, error: 'user_email and amount are required' });
    }

    const supabase = getSupabase();

    // Get current balance
    const { data: existing } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_email', user_email)
      .maybeSingle();

    const currentBalance = existing ? Number(existing.balance) : 0;
    const newBalance = currentBalance - Number(amount);

    // Upsert user_credits
    const { error: upsertError } = await supabase
      .from('user_credits')
      .upsert(
        { user_email, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' }
      );

    if (upsertError) {
      console.error('[credits] Deduct upsert error:', upsertError);
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    // Insert transaction record
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_email,
        amount: -Number(amount),
        balance_after: newBalance,
        type: 'deduction',
        description: description || null,
        video_session_id: video_session_id || null,
      });

    if (txError) {
      console.error('[credits] Transaction insert error:', txError);
    }

    console.log(`[credits] Deducted ${amount} from ${user_email}. New balance: ${newBalance}`);
    return res.json({ success: true, balance: newBalance });
  } catch (err) {
    console.error('[credits] Deduct exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to deduct credits' });
  }
}

/**
 * GET /api/credits/has-purchased?email=...
 * Check if a user has ever purchased credits.
 */
export async function hasPurchasedHandler(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query param is required' });
    }

    const { data, error } = await getSupabase()
      .from('credit_transactions')
      .select('id')
      .eq('user_email', email)
      .eq('type', 'purchase')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[credits] Has-purchased error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, hasPurchased: !!data });
  } catch (err) {
    console.error('[credits] Has-purchased exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to check purchase history' });
  }
}
