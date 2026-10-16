import { describe, expect, it } from 'vitest';
import { encodeWav, renderSoundtrack } from './audio';
import { composePhrase, phraseDuration, scaleNote, SOUND_PALETTES } from './audioScore';
import type { PaintingId } from '../types';

describe('original scene scores', () => {
  it('uses scene-appropriate environmental layers and labels', () => {
    expect(SOUND_PALETTES.winter.water).toBe(0);
    expect(SOUND_PALETTES.winter.field).not.toContain('oar');
    expect(SOUND_PALETTES.winter.field).not.toContain('drip');
    expect(SOUND_PALETTES.qingming.market).toBeGreaterThan(0);
    expect(SOUND_PALETTES.starry.field).toContain('insect');
    for (const palette of Object.values(SOUND_PALETTES))
      expect(palette.description.length).toBeGreaterThan(5);
  });
  it('assigns every scene a distinct motif, tempo and tonal palette', () => {
    expect(Object.keys(SOUND_PALETTES)).toHaveLength(16);
    expect(
      new Set(Object.values(SOUND_PALETTES).map((p) => JSON.stringify([p.motif, p.root, p.tempo])))
        .size,
    ).toBe(16);
    for (const id of Object.keys(SOUND_PALETTES) as PaintingId[]) {
      const phrase = composePhrase(id, 0);
      expect(phrase).toEqual(composePhrase(id, 0));
      expect(phrase).not.toEqual(composePhrase(id, 3));
      expect(phrase.notes.length).toBeGreaterThan(10);
      expect(phrase.fields.length).toBeGreaterThan(0);
      for (const note of phrase.notes) {
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.at).toBeLessThan(phraseDuration(SOUND_PALETTES[id]));
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThan(0.1);
        expect(note.midi).toBeGreaterThan(24);
        expect(note.midi).toBeLessThan(90);
      }
    }
  });
  it('wraps negative scale degrees down rather than producing invalid pitches', () => {
    expect(scaleNote(60, [0, 2, 4, 7, 9], -1)).toBe(57);
    expect(scaleNote(60, [0, 2, 4, 7, 9], 5)).toBe(72);
  });
});

describe('soundtrack encoding', () => {
  it('writes a stereo PCM WAV with interleaved channels and bounded samples', async () => {
    const blob = encodeWav([new Float32Array([0, 0.5, -2]), new Float32Array([1, -0.5, 2])], 48000);
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.type).toBe('audio/wav');
    expect(view.byteLength).toBe(56);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(52, true)).toBe(-32768);
    expect(view.getInt16(54, true)).toBe(32767);
  });
  it('rejects mismatched channels and invalid render settings before allocating audio', async () => {
    expect(() => encodeWav([], 48000)).toThrow();
    expect(() => encodeWav([new Float32Array(1), new Float32Array(2)], 48000)).toThrow();
    await expect(renderSoundtrack('qianli', NaN)).rejects.toThrow(RangeError);
    await expect(renderSoundtrack('qianli', 601)).rejects.toThrow(RangeError);
    await expect(renderSoundtrack('qianli', 2, 8000)).rejects.toThrow(RangeError);
  });
});
