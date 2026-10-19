import { expect, it } from 'vitest';
import { ORIGINALS } from './originals';
import { QINGMING_READING_STOPS, qingmingReadingIndex } from './qingmingReading';
it('links all six reference crops to a matching, ordered camera stop', () => {
  expect(QINGMING_READING_STOPS).toHaveLength(6);
  for (const stop of QINGMING_READING_STOPS) {
    expect(qingmingReadingIndex(stop.progress)).toBe(stop.imageIndex);
    expect(ORIGINALS.qingming!.images[stop.imageIndex]!.src).toContain(
      `section-${stop.imageIndex}`,
    );
  }
  expect(qingmingReadingIndex(0)).toBe(3);
  expect(qingmingReadingIndex(Number.NaN)).toBe(3);
  expect(qingmingReadingIndex(1)).toBe(6);
});
