export type Tone = 'professional' | 'casual' | 'educational';

export type VideoStatus = 'queued' | 'generating' | 'ready' | 'error' | 'deleted';

export interface ExtractTextResponse {
  success: boolean;
  text?: string;
  pageCount?: number;
  characterCount?: number;
  error?: string;
  code?: string;
}

export interface GenerateScriptRequest {
  text: string;
  tone: Tone;
  maxLengthSeconds: number;
}

export interface GenerateScriptResponse {
  success: boolean;
  script?: string;
  estimatedDurationSeconds?: number;
  wordCount?: number;
  error?: string;
  code?: string;
}

export interface GenerateVideoRequest {
  script: string;
  videoName?: string;
  backgroundUrl?: string;
}

export interface GenerateVideoResponse {
  success: boolean;
  videoId?: string;
  hostedUrl?: string;
  status?: VideoStatus;
  error?: string;
  code?: string;
}

export interface VideoStatusResponse {
  success: boolean;
  videoId?: string;
  status?: VideoStatus;
  hostedUrl?: string;
  downloadUrl?: string;
  errorMessage?: string;
  error?: string;
  code?: string;
}

export interface TavusGenerateVideoPayload {
  replica_id: string;
  script: string;
  video_name?: string;
  background_url?: string;
  background_source_url?: string;
  callback_url?: string;
  fast?: boolean;
  transparent_background?: boolean;
  watermark_image_url?: string;
}

export interface TavusVideoResponse {
  video_id: string;
  video_name: string;
  status: VideoStatus;
  hosted_url: string;
  created_at: string;
  download_url?: string;
  error_message?: string;
}

export type PipelineStep = 'upload' | 'extract' | 'mode-select' | 'script' | 'video' | 'page-by-page' | 'complete';

export type VideoMode = 'summary' | 'page-by-page';

export type PageByPageStep =
  | 'converting-pages'
  | 'generating-scripts'
  | 'generating-videos'
  | 'stitching'
  | 'done'
  | 'error';

export interface PageScript {
  pageNumber: number; // 0 = intro
  script: string;
  wordCount: number;
}

export interface PageVideo {
  pageNumber: number; // 0 = intro
  videoId: string;
  status: VideoStatus;
  hostedUrl?: string;
  downloadUrl?: string;
}

export interface ConvertPagesResponse {
  success: boolean;
  imageUrls?: string[];
  localPaths?: string[]; // absolute file paths for server-side PiP compositing
  pageCount?: number;
  error?: string;
}

export interface GeneratePageScriptsRequest {
  textByPage: string[];
  fullText: string;
}

export interface GeneratePageScriptsResponse {
  success: boolean;
  scripts?: PageScript[];
  error?: string;
}

export interface StitchVideosRequest {
  videoUrls: string[];
  imageUrls?: string[]; // local file paths for PiP compositing (index 0 = page 1)
}

export interface StitchVideosResponse {
  success: boolean;
  outputUrl?: string;
  error?: string;
}
