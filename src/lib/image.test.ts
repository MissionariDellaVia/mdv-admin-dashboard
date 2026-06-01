import { describe, it, expect } from 'vitest';
import { computeTargetSize } from './image';

describe('computeTargetSize', () => {
  it('keeps size when within bounds', () => {
    expect(computeTargetSize(800, 600, 1920, 1920)).toEqual({ width: 800, height: 600 });
  });
  it('scales down preserving aspect ratio (landscape)', () => {
    expect(computeTargetSize(4000, 2000, 1920, 1920)).toEqual({ width: 1920, height: 960 });
  });
  it('scales down preserving aspect ratio (portrait)', () => {
    expect(computeTargetSize(2000, 4000, 1920, 1920)).toEqual({ width: 960, height: 1920 });
  });
});
