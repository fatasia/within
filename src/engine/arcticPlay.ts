import { Euler, MathUtils, Vector3 } from 'three';

/** Gentle, reversible play loop: approach, curious bow, hop away, settle. */
export function polarPlay(time: number): { approach: number; paw: number; hop: number; phase: number } {
  const phase = ((time % 24) + 24) % 24;
  const approach = MathUtils.smoothstep(phase, 1, 6) * (1 - MathUtils.smoothstep(phase, 12, 17));
  const paw = MathUtils.smoothstep(phase, 6, 8) * (1 - MathUtils.smoothstep(phase, 10, 12));
  const hop = phase > 11 && phase < 14 ? Math.sin((phase - 11) / 3 * Math.PI) * .18 : 0;
  return { approach, paw, hop, phase };
}

export interface PolarChasePose { x: number; z: number; heading: number; running: boolean; }
const cycle48 = (time: number) => ((time % 48) + 48) % 48;

/** A separated oval chase, blending back to the same resting positions at the loop seam. */
export function polarChase(time: number, actor: 'bear' | 0 | 1): PolarChasePose {
  const phase = cycle48(time);
  const positions = (t: number): [number, number] => {
    const p = cycle48(t), blend = MathUtils.smoothstep(p, 24, 27) * (1 - MathUtils.smoothstep(p, 44, 48));
    // Reverse after one lap: penguins lead first, then chase the bear on the way back.
    const angle = -Math.PI / 2 + Math.sin(MathUtils.clamp((p - 27) / 17, 0, 1) * Math.PI) * Math.PI * 2;
    const lead = actor === 'bear' ? 0 : actor === 0 ? 1.12 : 1.65;
    const orbitX = -14 + Math.cos(angle + lead) * 4.6, orbitZ = 15.6 + Math.sin(angle + lead) * 3.6;
    const play = polarPlay(p);
    const restingX = actor === 'bear' ? -14 : -6.4 - actor * .6 - play.approach * 2.9;
    const restingZ = actor === 'bear' ? 12 : 12 + (actor === 0 ? -1.3 : 1.4);
    return [MathUtils.lerp(restingX, orbitX, blend), MathUtils.lerp(restingZ, orbitZ, blend)];
  };
  const [x, z] = positions(time), [beforeX, beforeZ] = positions(time - .01), [afterX, afterZ] = positions(time + .01);
  const dx = afterX - beforeX, dz = afterZ - beforeZ, moving = Math.hypot(dx, dz) > .0001;
  return { x, z, heading: moving ? actor === 'bear' ? Math.atan2(dz, -dx) : Math.atan2(dx, dz) : actor === 'bear' ? Math.PI : -Math.PI / 2, running: phase > 24 && phase < 47 };
}

export interface PolarBallPose { x: number; z: number; lift: number; rotation: number; leftKick: number; rightKick: number; }
/** Ball velocity falls after each foot contact; rotation is distance divided by radius. */
export function polarBall(time: number): PolarBallPose {
  const phase = ((time % 8) + 8) % 8, reverse = phase >= 4, local = phase % 4;
  const u = MathUtils.clamp((local - .5) / 3, 0, 1), travel = 4.8 * (2 * u - u * u);
  const x = reverse ? 7.4 - travel : 2.6 + travel;
  const kick = MathUtils.smoothstep(local, .18, .5) * (1 - MathUtils.smoothstep(local, .5, .85));
  return { x, z: 12, lift: Math.sin(u * Math.PI) * .1, rotation: -(x - 2.6) / .28, leftKick: reverse ? 0 : kick, rightKick: reverse ? kick : 0 };
}

export interface PolarSnowballPose { x: number; z: number; lift: number; flight: boolean; burst: number; recipient: 2 | 3; windup: number; duck: number; }
/** A thrown snowball lands beside, not inside, the recipient; its fragments have a short ballistic lifetime. */
export function polarSnowball(time: number): PolarSnowballPose {
  const phase = ((time % 16) + 16) % 16, local = phase % 8, recipient = phase < 8 ? 3 : 2;
  const u = MathUtils.clamp((local - 1.2) / 1.4, 0, 1), targetX = recipient === 3 ? 8.85 : 2.85;
  const burst = local >= 2.6 && local < 3.4 ? (local - 2.6) / .8 : -1;
  const release = time - local + 1.2, heading = Math.atan2(recipient === 3 ? -2.15 : -8.15, -3.4);
  const hand = new Vector3(-.06,-.46,0).applyEuler(new Euler(-1.4,-0, -(.2+Math.sin((release+2.8)*1.4)*.28)-.7)).add(new Vector3(-.285,.9,0)).multiplyScalar(.97).applyAxisAngle(new Vector3(0,1,0),heading);
  return { x: MathUtils.lerp(11+hand.x, targetX, u), z: MathUtils.lerp(16+hand.z, 12.6, u), lift: (1 - u) * Math.max(.1,hand.y) + 4 * 1.7 * u * (1 - u), flight: local >= 1.2 && local < 2.6, burst, recipient, windup: MathUtils.smoothstep(local, .25, 1.1) * (1 - MathUtils.smoothstep(local, 1.2, 1.55)), duck: MathUtils.smoothstep(local, 2, 2.6) * (1 - MathUtils.smoothstep(local, 2.8, 3.5)) };
}

