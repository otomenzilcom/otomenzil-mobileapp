import { describe, it, expect } from '@jest/globals';

import {
  applyStartChange,
  applyTargetChange,
  gaugeColorForTarget,
  START_DEFAULT,
  TARGET_DEFAULT,
} from '../garageChargeState';

describe('applyStartChange', () => {
  it('step-clamps the start value to 0…90 in steps of 5', () => {
    expect(applyStartChange({ startPercent: START_DEFAULT, targetPercent: TARGET_DEFAULT }, 33)).toEqual(
      { startPercent: 35, targetPercent: 80 },
    );
    expect(applyStartChange({ startPercent: 20, targetPercent: 80 }, -10)).toEqual({
      startPercent: 0,
      targetPercent: 80,
    });
    expect(applyStartChange({ startPercent: 20, targetPercent: 80 }, 200)).toEqual({
      startPercent: 90,
      targetPercent: 100,
    });
  });

  it('bumps the target to start+10 (capped at 100) when start crowds it', () => {
    expect(applyStartChange({ startPercent: 20, targetPercent: 80 }, 75)).toEqual({
      startPercent: 75,
      targetPercent: 85,
    });
    // start reaches its max; target cannot exceed 100.
    expect(applyStartChange({ startPercent: 20, targetPercent: 80 }, 90)).toEqual({
      startPercent: 90,
      targetPercent: 100,
    });
  });

  it('leaves the target untouched when there is at least a 10% margin', () => {
    expect(applyStartChange({ startPercent: 20, targetPercent: 80 }, 50)).toEqual({
      startPercent: 50,
      targetPercent: 80,
    });
  });
});

describe('applyTargetChange', () => {
  it('step-clamps the target to (start+10)…100', () => {
    expect(applyTargetChange({ startPercent: 20, targetPercent: 80 }, 55)).toEqual({
      startPercent: 20,
      targetPercent: 55,
    });
    // cannot drop below start+10.
    expect(applyTargetChange({ startPercent: 60, targetPercent: 80 }, 40)).toEqual({
      startPercent: 60,
      targetPercent: 70,
    });
    expect(applyTargetChange({ startPercent: 20, targetPercent: 80 }, 200)).toEqual({
      startPercent: 20,
      targetPercent: 100,
    });
  });
});

describe('gaugeColorForTarget', () => {
  it('maps the target band to a color', () => {
    expect(gaugeColorForTarget(20)).toBe('#EF4444');
    expect(gaugeColorForTarget(21)).toBe('#F59E0B');
    expect(gaugeColorForTarget(55)).toBe('#F59E0B');
    expect(gaugeColorForTarget(80)).toBe('#3B82F6');
    expect(gaugeColorForTarget(81)).toBe('#10B981');
    expect(gaugeColorForTarget(100)).toBe('#10B981');
  });
});
