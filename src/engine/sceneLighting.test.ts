import { describe, expect, it } from 'vitest';
import { getPainting, PAINTINGS } from '../data/paintings';
import {
  createLightingState,
  resolveSceneNight,
  sampleSceneLighting,
  SCENE_LIGHTING,
  isNightScene,
} from './sceneLighting';

describe('Painting-specific seasonal light', () => {
  it('keeps the Qingming street interiors readable at the end of the journey', () => {
    const light = sampleSceneLighting(getPainting('qingming'), 1, true, 2, createLightingState());
    expect(light.ambientIntensity).toBeGreaterThanOrEqual(1.2);
    expect(light.sunIntensity).toBeGreaterThanOrEqual(0.75);
    expect(light.groundColor.r).toBeGreaterThan(0.2);
  });
  it('keeps polar ice and deepwater subjects readable while retaining a dark background', () => {
    for (const id of ['arctic', 'deepsea'] as const) {
      expect(isNightScene(id)).toBe(true);
      expect(resolveSceneNight(id, 'day', 0)).toBe(1);
      const light = sampleSceneLighting(getPainting(id), 1, true, 2, createLightingState());
      expect(light.sunIntensity).toBeGreaterThanOrEqual(1);
      expect(light.ambientIntensity).toBeGreaterThanOrEqual(1.5);
      expect(light.ambientColor.g).toBeGreaterThan(light.background.g);
    }
    expect(isNightScene('sakura')).toBe(false);
  });
  it('defines all ten worlds and keeps every sampled light and fog range finite and restrained', () => {
    expect(Object.keys(SCENE_LIGHTING).sort()).toEqual(PAINTINGS.map((p) => p.id).sort());
    const out = createLightingState();
    for (const painting of PAINTINGS)
      for (const night of [0, 0.2, 0.4, 0.75, 1, Number.NaN])
        for (const mist of [false, true])
          for (let period = 0; period < 5; period++) {
            sampleSceneLighting(painting, night, mist, period, out);
            expect(out.sunIntensity).toBeGreaterThan(0.1);
            expect(out.sunIntensity).toBeLessThanOrEqual(1.7);
            expect(out.ambientIntensity).toBeGreaterThan(0.6);
            expect(out.ambientIntensity).toBeLessThanOrEqual(1.9);
            expect(out.fogNear).toBeGreaterThanOrEqual(40);
            expect(out.fogFar).toBeGreaterThan(out.fogNear + 100);
            expect(out.mistOpacity).toBeLessThanOrEqual(0.2);
            for (const color of [
              out.background,
              out.sunColor,
              out.ambientColor,
              out.groundColor,
              out.fogColor,
              out.mistColor,
            ])
              for (const value of color.toArray()) {
                expect(Number.isFinite(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
              }
          }
  });

  it('locks the two original night paintings to their night appearance regardless of time controls', () => {
    for (const id of ['starry', 'winter'] as const) {
      for (const time of ['day', 'sunset', 'night', 'journey'] as const)
        expect(resolveSceneNight(id, time, 0)).toBe(1);
      const a = sampleSceneLighting(getPainting(id), 0, true, 2, createLightingState());
      const b = sampleSceneLighting(getPainting(id), 1, true, 2, createLightingState());
      expect(a).toEqual(b);
    }
    expect(resolveSceneNight('qingming', 'day', 1)).toBe(0);
    expect(resolveSceneNight('qingming', 'sunset', 0)).toBe(0.4);
    expect(resolveSceneNight('qingming', 'journey', 0.75)).toBeCloseTo(0.54);
  });

  it('does not apply the universal orange sunset to ink scenes, and preserves humid diffuse fill', () => {
    expect(SCENE_LIGHTING.fuchun.duskStrength).toBeLessThan(0.1);
    expect(SCENE_LIGHTING.xishan.duskStrength).toBeLessThan(SCENE_LIGHTING.qingming.duskStrength);
    for (const id of ['wuhan', 'guilin', 'zhangjiajie', 'fuchun'] as const) {
      const light = sampleSceneLighting(getPainting(id), 0, true, 2, createLightingState());
      expect(light.ambientIntensity).toBeGreaterThan(light.sunIntensity);
    }
    const rain = sampleSceneLighting(getPainting('wuhan'), 0, true, 2, createLightingState());
    expect(rain.sunIntensity).toBe(0.62);
    expect(rain.ambientIntensity).toBe(1.9);
    expect([rain.fogNear, rain.fogFar]).toEqual([45, 265]);
  });

  it('distinguishes imperial destruction from prosperity without fake lightning or extra lights', () => {
    const prosperous = sampleSceneLighting(
      getPainting('empire'),
      0,
      true,
      2,
      createLightingState(),
    );
    const destruction = sampleSceneLighting(
      getPainting('empire'),
      0,
      true,
      3,
      createLightingState(),
    );
    const desolation = sampleSceneLighting(
      getPainting('empire'),
      0,
      true,
      4,
      createLightingState(),
    );
    expect(destruction.sunIntensity).toBeLessThan(prosperous.sunIntensity / 2);
    expect(destruction.fogFar).toBeLessThan(prosperous.fogFar);
    expect(desolation.sunIntensity).toBeGreaterThan(destruction.sunIntensity);
    expect(desolation.sunIntensity).toBeLessThan(prosperous.sunIntensity);
  });

  it('reuses every color object, resets overrides on scene change, and interpolates continuously', () => {
    const out = createLightingState();
    const background = out.background,
      fog = out.fogColor,
      sun = out.sunColor;
    sampleSceneLighting(getPainting('empire'), 0, true, 3, out);
    expect(sampleSceneLighting(getPainting('qianli'), 0.4, false, 2, out)).toBe(out);
    expect(out.background).toBe(background);
    expect(out.fogColor).toBe(fog);
    expect(out.sunColor).toBe(sun);
    expect([out.fogNear, out.fogFar, out.mistOpacity]).toEqual([260, 700, 0]);
    const a = sampleSceneLighting(getPainting('qianli'), 0.4, true, 2, createLightingState());
    const b = sampleSceneLighting(getPainting('qianli'), 0.4001, true, 2, createLightingState());
    expect(Math.abs(a.sunIntensity - b.sunIntensity)).toBeLessThan(0.001);
    expect(Math.abs(a.background.r - b.background.r)).toBeLessThan(0.001);
    expect(out).toEqual(
      sampleSceneLighting(getPainting('qianli'), 0.4, false, 2, createLightingState()),
    );
  });
});
