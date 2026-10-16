import type { Vec3 } from '../types';
import { clamp } from './math';

/** Route progress, not wall-clock time, drives both the vessel and its following camera. */
export interface SakuraVoyageSample {
  boatPosition: Vec3;
  /** Euler XYZ; the authored bow points along local +X. */
  boatRotation: Vec3;
  eye: Vec3;
  target: Vec3;
}

export const SAKURA_VOYAGE_START_Z = 20;
export const SAKURA_VOYAGE_END_Z = -94;

/**
 * A quiet downstream journey through the bridge (-26), town (-42) and lake torii (-85).
 * No accumulated state, modulo loop or direction reversal: scrubbing, playback and offline
 * renders all sample exactly the same position. Elapsed seconds only add small water motion.
 */
export function sampleSakuraVoyage(progress: number, elapsed = 0): SakuraVoyageSample {
  const p = clamp(progress);
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const a = p * Math.PI * 1.2;
  const b = p * Math.PI * 3;
  const x = Math.sin(a) * 1.3 + Math.sin(b) * 0.4;
  const z = SAKURA_VOYAGE_START_Z + (SAKURA_VOYAGE_END_Z - SAKURA_VOYAGE_START_Z) * p;
  const dx = Math.cos(a) * 1.3 * Math.PI * 1.2 + Math.cos(b) * 0.4 * Math.PI * 3;
  const dz = SAKURA_VOYAGE_END_Z - SAKURA_VOYAGE_START_Z;
  const length = Math.hypot(dx, dz);
  const forwardX = dx / length, forwardZ = dz / length;
  const rightX = -forwardZ, rightZ = forwardX;
  const bob = Math.sin(time * 1.15) * 0.035;
  const followDistance = 14;
  const eyeZ = z - forwardZ * followDistance + rightZ * 1.1;
  // Lower ahead of the bridge, then rise only after the following camera clears its deck.
  const bridgeDistance = Math.abs(eyeZ + 26);
  const clearance = clamp((bridgeDistance - 3.8) / 10);
  const lift = clearance * clearance * (3 - 2 * clearance);
  const eyeHeight = 3.05 + 3.65 * lift;
  return {
    boatPosition: [x, 0.06 + bob, z],
    boatRotation: [Math.sin(time * 0.7 + 1.3) * 0.018, Math.atan2(-forwardZ, forwardX), Math.sin(time * 0.85) * 0.025],
    // A higher, more distant chase view settles to bridge clearance without a hard camera cut.
    // A small starboard offset reveals the canopy and boatman without entering the canopy.
    eye: [x - forwardX * followDistance + rightX * 1.1, eyeHeight + bob * 0.18, eyeZ],
    // Aim close to the vessel, not far ahead: the stern must clear the bottom playback panel.
    target: [x + forwardX * 0.25, 0.85 + bob * 0.1, z + forwardZ * 0.25],
  };
}

/** Passenger eye, with bounded relative look angles; independent of terrain walking. */
export function sampleSakuraPassengerView(progress: number, elapsed = 0, yaw = 0, pitch = 0): { eye: Vec3; target: Vec3 } {
  const voyage = sampleSakuraVoyage(progress, elapsed);
  const heading = voyage.boatRotation[1];
  const forwardX = Math.cos(heading), forwardZ = -Math.sin(heading);
  const eye: Vec3 = [voyage.boatPosition[0] + forwardX * 1.8, voyage.boatPosition[1] + 1.22, voyage.boatPosition[2] + forwardZ * 1.8];
  const turn = clamp(yaw, -Math.PI * 0.85, Math.PI * 0.85);
  const tilt = clamp(pitch, -0.65, 0.65);
  const direction = heading - turn;
  const horizontal = Math.cos(tilt) * 12;
  return { eye, target: [eye[0] + Math.cos(direction) * horizontal, eye[1] + Math.sin(tilt) * 12, eye[2] - Math.sin(direction) * horizontal] };
}
