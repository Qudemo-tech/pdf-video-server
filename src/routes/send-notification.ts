import { Request, Response } from 'express';
import { sendVideoReadyEmail } from '../lib/email';
import { generateSignedUrl } from '../lib/gcs';

// Track emails already sent (in-memory dedup)
const sentEmails = new Set<string>();

/**
 * POST /api/send-notification
 * Send an email notification when a video is ready.
 * Body: { email, userName, videoUrl, mode }
 */
export async function sendNotificationHandler(req: Request, res: Response) {
  try {
    const { email, userName, videoUrl, mode } = req.body;
    console.log('[send-notification] Received — email:', email, '| videoUrl:', videoUrl, '| mode:', mode);

    if (!email || !videoUrl) {
      return res.status(400).json({ success: false, error: 'email and videoUrl are required' });
    }

    // Dedup by email+videoUrl
    const dedupeKey = `${email}:${videoUrl}`;
    if (sentEmails.has(dedupeKey)) {
      console.log('[send-notification] Already sent for this email+video, skipping');
      return res.json({ success: true, alreadySent: true });
    }

    // Generate a signed URL so the recipient can access the video directly from the email
    let emailVideoUrl = videoUrl;
    try {
      emailVideoUrl = await generateSignedUrl(videoUrl);
    } catch (err) {
      console.warn('[send-notification] Failed to generate signed URL, using original:', err);
    }

    const sent = await sendVideoReadyEmail({
      to: email,
      userName: userName || null,
      videoUrl: emailVideoUrl,
      mode: mode || 'summary',
    });

    if (sent) {
      sentEmails.add(dedupeKey);
    }

    return res.json({ success: true, sent });
  } catch (err) {
    console.error('[send-notification] Exception:', err);
    return res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
}
