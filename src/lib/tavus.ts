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

  const response = await fetch(`${TAVUS_BASE_URL}/videos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavus API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<TavusVideoResponse>;
}

export async function getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
  const response = await fetch(`${TAVUS_BASE_URL}/videos/${videoId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavus API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<TavusVideoResponse>;
}
