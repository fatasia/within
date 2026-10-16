import type { Object3D, Quaternion, Vector3 } from 'three';
interface Figure { root: Object3D; neck: Object3D; head: Object3D }
interface BoatmanPose { shift: number; dip: number; lean: number; turn: number; grips: [Vector3, Vector3]; hands: Quaternion; look: [number, number, number] }
export function createPassenger(source: Object3D): Figure;
export function createWagasa(source: Object3D): Object3D;
export function createBoatman(source: Object3D): { root: Object3D; pose(options: BoatmanPose): void };
export function headLook(figure: Figure): (pitch: number, yaw: number, roll: number, share?: number) => void;
