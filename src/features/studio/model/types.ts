export type StudioJobType = 'audio' | 'video' | 'infographic';

export type StudioJobStatus = 'idle' | 'pending' | 'processing' | 'done' | 'error';

export interface StudioJob {
  job_id: string;
  job_type: StudioJobType;
  status: StudioJobStatus;
  result_url: string | null;
  error_message: string | null;
}

export interface StudioOutputConfig {
  label: string;
  description: string;
  icon: string;
  estimatedMinutes: string;
}

export const STUDIO_OUTPUTS: Record<StudioJobType, StudioOutputConfig> = {
  audio: {
    label: 'Audio Overview',
    description: 'A podcast-style AI conversation about your notes.',
    icon: 'Headphones',
    estimatedMinutes: '5–10 min',
  },
  video: {
    label: 'Video Overview',
    description: 'A dynamic slideshow video with AI narration.',
    icon: 'Video',
    estimatedMinutes: '10–20 min',
  },
  infographic: {
    label: 'Infographic',
    description: 'A visual summary image of your key concepts.',
    icon: 'Image',
    estimatedMinutes: '1–2 min',
  },
};
