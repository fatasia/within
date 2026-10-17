import type { Vec3 } from '../types';
const clamp = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export interface RoadsterMotionSample {
  position: Vec3;
  rotation: Vec3;
  eye: Vec3;
  target: Vec3;
  cockpitEye: Vec3;
  cockpitTarget: Vec3;
  distance: number;
  steer: number;
  jet: number;
  grip: number;
  wing: number;
}
/** Procedural test-track demonstration, not measured vehicle performance. Local nose is -Z. */
export function roadsterTrack(distance: number): { position: Vec3; heading: number } {
  const bend = Math.max(0, distance - 90) / 65;
  return distance <= 90
    ? { position: [0, 0.8, -distance], heading: 0 }
    : { position: [65 * (1 - Math.cos(bend)), 0.8, -90 - 65 * Math.sin(bend)], heading: -bend };
}
export function sampleRoadsterMotion(progress: number, elapsed = 0): RoadsterMotionSample {
  const p = clamp(progress);
  void elapsed;
  const drive = smooth((p - 0.4) / 0.6);
  const distance = drive * 155;
  const { position, heading } = roadsterTrack(distance);
  const [x, y, z] = position;
  const world = (px: number, py: number, pz: number): Vec3 => [
    x + px * Math.cos(heading) + pz * Math.sin(heading),
    y + py,
    z - px * Math.sin(heading) + pz * Math.cos(heading),
  ];
  const reveal = smooth(p / 0.4);
  const angle = -0.7 + (Math.atan2(-5.4, -8.6) + 0.7) * reveal;
  const radius = 6.6 + (Math.hypot(5.4, 8.6) - 6.6) * reveal;
  const eye =
    p < 0.4
      ? world(Math.sin(angle) * radius, 2.2 + 0.3 * reveal, -Math.cos(angle) * radius)
      : world(-5.4, 2.5, 8.6);
  return {
    position,
    rotation: [0, heading, 0],
    eye,
    target: world(0, 1.35, -0.65),
    cockpitEye: world(-0.38, 0.98, 0.12),
    cockpitTarget: world(-0.38, 0.88, -12),
    distance,
    steer: distance > 90 ? -0.044 : 0,
    jet: smooth((p - 0.41) / 0.035) * (1 - smooth((p - 0.56) / 0.06)),
    grip: smooth((p - 0.66) / 0.05) * (1 - smooth((p - 0.92) / 0.06)),
    wing: smooth((p - 0.77) / 0.12),
  };
}
export function sampleRoadsterCockpit(
  progress: number,
  elapsed = 0,
  yaw = 0,
  pitch = 0,
): { eye: Vec3; target: Vec3 } {
  const m = sampleRoadsterMotion(progress, elapsed);
  const turn = Math.max(-1.4, Math.min(1.4, yaw)) + m.rotation[1];
  const tilt = Math.max(-0.5, Math.min(0.5, pitch));
  return {
    eye: m.cockpitEye,
    target: [
      m.cockpitEye[0] - Math.sin(turn) * 12 * Math.cos(tilt),
      m.cockpitEye[1] + Math.sin(tilt) * 12,
      m.cockpitEye[2] - Math.cos(turn) * 12 * Math.cos(tilt),
    ],
  };
}

export interface RoadsterDriveInput {
  throttle: number;
  steer: number;
  brake: number;
  grip?: number;
}
export interface RoadsterDriveState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  distance: number;
}
export function stepRoadsterDrive(
  state: RoadsterDriveState,
  input: RoadsterDriveInput,
  seconds: number,
): RoadsterDriveState {
  const dt = Math.max(0, Math.min(0.1, Number.isFinite(seconds) ? seconds : 0));
  const throttle = Math.max(-1, Math.min(1, input.throttle)),
    steer = Math.max(-1, Math.min(1, input.steer));
  let speed = state.speed + throttle * 7 * dt;
  const drag = (0.3 + Math.abs(speed) * 0.13 + Math.max(0, input.brake) * 18) * dt;
  speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - drag);
  speed = Math.max(-6, Math.min(25, speed));
  const heading =
    state.heading - steer * Math.min(1.15, Math.abs(speed) * 0.1) * (1 + .25 * clamp(input.grip ?? 0)) * Math.sign(speed) * dt;
  let x = state.x - Math.sin(heading) * speed * dt,
    z = state.z - Math.cos(heading) * speed * dt;
  if (x < -22 || x > 100 || z < -190 || z > 35) {
    speed = 0;
    x = Math.max(-22, Math.min(100, x));
    z = Math.max(-190, Math.min(35, z));
  }
  return { x, z, heading, speed, distance: state.distance + speed * dt };
}
export function roadsterPoseView(
  position: Vec3,
  heading: number,
): Pick<
  RoadsterMotionSample,
  'position' | 'rotation' | 'eye' | 'target' | 'cockpitEye' | 'cockpitTarget'
> {
  const world = (x: number, y: number, z: number): Vec3 => [
    position[0] + x * Math.cos(heading) + z * Math.sin(heading),
    position[1] + y,
    position[2] - x * Math.sin(heading) + z * Math.cos(heading),
  ];
  return {
    position,
    rotation: [0, heading, 0],
    eye: world(-4.4, 2.3, 7.2),
    target: world(0, 0.6, -1.1),
    cockpitEye: world(-0.38, 0.98, 0.12),
    cockpitTarget: world(-0.38, 0.98, -12),
  };
}
