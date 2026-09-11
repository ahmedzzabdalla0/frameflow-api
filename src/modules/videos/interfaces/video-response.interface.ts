export interface VideoResponse {
  id: number;
  rel_path: string;
  title: string;
  added_at: string;
  duration_seconds: number;
  size_bytes: number;
  rating: number | null;
  categories: string[];
  thumb_seek?: string;
}

export interface PaginatedVideosResponse {
  videos: VideoResponse[];
  total: number;
}

export interface VideoStatsResponse {
  total_videos: number;
  total_size_bytes: number;
}
