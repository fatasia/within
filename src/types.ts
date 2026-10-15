export type PaintingId =
  | 'qianli'
  | 'fuchun'
  | 'xishan'
  | 'starry'
  | 'empire'
  | 'winter'
  | 'qingming'
  | 'zhangjiajie'
  | 'guilin';
export type ViewMode = 'scroll' | 'orbit' | 'walk';
export type TimeMode = 'journey' | 'day' | 'sunset' | 'night';
export type Quality = 'high' | 'balanced' | 'low';
export type Vec3 = readonly [number, number, number];
export interface Chapter {
  title: string;
  subtitle: string;
  description: string;
  progress: number;
}
export interface Peak {
  profile?: PaintingId;
  x: number;
  z: number;
  radius: number;
  height: number;
  seed: number;
  stretch?: number;
}
export interface Painting {
  id: PaintingId;
  title: string;
  shortTitle: string;
  english: string;
  artist: string;
  era: string;
  technique: string;
  tagline: string;
  introduction: string;
  accent: string;
  palette: { sky: string; water: string; low: string; high: string; ink: string; leaf: string };
  peaks: Peak[];
  chapters: Chapter[];
  overview: { eye: Vec3; target: Vec3 };
  route: Vec3[];
  source: string;
  seed: number;
}
export interface ExperienceState {
  painting: PaintingId;
  entered: boolean;
  mode: ViewMode;
  playing: boolean;
  speed: number;
  progress: number;
  time: TimeMode;
  quality: Quality;
  sound: boolean;
  mist: boolean;
  period: number;
}
export interface Telemetry {
  playing?: boolean;
  progress: number;
  fps: number;
  drawCalls: number;
  triangles: number;
}
