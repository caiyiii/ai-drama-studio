export const FAL_QUEUE_BASE_URL = "https://queue.fal.run";

export interface FalQueueSubmitResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  status?: string;
  detail?: string | Array<{ msg?: string; type?: string }>;
  error?: string;
  message?: string;
}

export interface FalQueueStatusResponse {
  status?: string;
  request_id?: string;
  response_url?: string;
  error?: string;
  logs?: unknown;
}

export interface FalImageItem {
  url?: string;
  content_type?: string;
  file_name?: string;
  file_data?: string;
  width?: number;
  height?: number;
}

export interface FalImageResultPayload {
  images?: FalImageItem[];
  image?: FalImageItem;
  seed?: number;
  prompt?: string;
}

export interface FalVideoItem {
  url?: string;
  content_type?: string;
  file_name?: string;
  file_data?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface FalVideoResultPayload {
  video?: FalVideoItem;
  videos?: FalVideoItem[];
  seed?: number;
}

export type FalResultPayload = FalImageResultPayload &
  FalVideoResultPayload &
  Record<string, unknown>;
