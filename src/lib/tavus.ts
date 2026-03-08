import { TavusGenerateVideoPayload, TavusVideoResponse } from '../types';

const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

function getHeaders(): Record<string, string> {
  return {
    'x-api-key': process.env.TAVUS_API_KEY!,
    'Content-Type': 'application/json',
  };
}

export async function generateVideo(
  script: string,
  videoName?: string,
  backgroundUrl?: string
): Promise<TavusVideoResponse> {
  const payload: TavusGenerateVideoPayload = {
    replica_id: process.env.TAVUS_REPLICA_ID!,
    script,
    video_name: videoName || 'PDF to Video',
    fast: false,
  };

  if (backgroundUrl) {
    payload.background_url = backgroundUrl;
  }

  console.log('[tavus] Sending video generation request — name:', payload.video_name, '| script length:', script.length, '| background:', backgroundUrl || 'none');
  const response = await fetch(`${TAVUS_BASE_URL}/videos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[tavus] Video generation failed — status:', response.status, '| body:', errorBody);
    throw new Error(`Tavus API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json() as TavusVideoResponse;
  console.log('[tavus] Video generation accepted — videoId:', result.video_id, '| status:', result.status);
  return result;
}

export async function getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
  const response = await fetch(`${TAVUS_BASE_URL}/videos/${videoId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[tavus] Status check failed — videoId:', videoId, '| status:', response.status);
    throw new Error(`Tavus API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json() as TavusVideoResponse;
  console.log('[tavus] Status check — videoId:', videoId, '| status:', result.status, result.status === 'ready' ? '| downloadUrl: ' + result.download_url : '');
  return result;
}
