import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

interface SendVideoReadyEmailParams {
  to: string;
  userName: string | null;
  videoUrl: string;
  mode: 'summary' | 'page-by-page';
}

export async function sendVideoReadyEmail({ to, userName, videoUrl, mode }: SendVideoReadyEmailParams): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'PDF to Video <support@pdf-to-video.com>';
  const greeting = userName ? `Hi ${userName}` : 'Hi there';
  const modeLabel = mode === 'summary' ? 'summary' : 'page-by-page';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px;">
      <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">Your video is ready!</h2>
      <p style="color: #444; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        ${greeting}, your ${modeLabel} video has been generated and is ready to download.
      </p>
      <a href="${videoUrl}"
         style="display: inline-block; background: #6C3CE1; color: #fff; text-decoration: none;
                padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
        Download Video
      </a>
      <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.5;">
        If the button above doesn't work, <a href="${videoUrl}" style="color: #6C3CE1;">click here</a> to download your video.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <p style="color: #aaa; font-size: 12px;">PDF to Video</p>
    </div>
  `;

  try {
    console.log('[email] Sending video-ready email to:', to, '| mode:', mode);
    const { error } = await getResend().emails.send({
      from,
      to,
      subject: 'Your video is ready!',
      html,
    });

    if (error) {
      console.error('[email] Send failed:', error);
      return false;
    }

    console.log('[email] Email sent successfully to:', to);
    return true;
  } catch (err) {
    console.error('[email] Send exception:', err);
    return false;
  }
}
