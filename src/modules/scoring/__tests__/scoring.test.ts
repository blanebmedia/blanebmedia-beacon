import { describe, it, expect } from 'vitest';
import { calculateBadgeLevel } from '../badge';
import {
  calculateBrandReadinessScore,
  getReadinessStage,
  applyFloorRule,
  isScoreVisible,
  type SystemScore,
} from '../score';

describe('calculateBadgeLevel', () => {
  it('maps 0 items to Level 0', () => expect(calculateBadgeLevel(0)).toBe(0));
  it('maps 1 item to Level 1', () => expect(calculateBadgeLevel(1)).toBe(1));
  it('maps 2 items to Level 1', () => expect(calculateBadgeLevel(2)).toBe(1));
  it('maps 3 items to Level 2', () => expect(calculateBadgeLevel(3)).toBe(2));
  it('maps 4 items to Level 2', () => expect(calculateBadgeLevel(4)).toBe(2));
  it('maps 5 items to Level 3', () => expect(calculateBadgeLevel(5)).toBe(3));
});

const makeSystems = (overrides: Partial<Record<string, number>> = {}): SystemScore[] => {
  const keys = ['administration', 'training', 'products', 'current_campaign', 'growth', 'logistics', 'marketing', 'finance'] as const;
  return keys.map((k) => ({ systemKey: k, badgeLevel: (overrides[k] ?? 0) as 0 | 1 | 2 | 3 }));
};

describe('calculateBrandReadinessScore', () => {
  it('returns 0 when all systems are Level 0', () => {
    expect(calculateBrandReadinessScore(makeSystems())).toBe(0);
  });
  it('returns 6.25 for one system at Level 2', () => {
    expect(calculateBrandReadinessScore(makeSystems({ marketing: 2 }))).toBe(6.25);
  });
  it('returns 12.5 for one system at Level 3', () => {
    expect(calculateBrandReadinessScore(makeSystems({ finance: 3 }))).toBe(12.5);
  });
  it('returns 25 in Phase 1 when marketing & finance are Level 3 (only active systems count)', () => {
    const all3 = Object.fromEntries(['administration', 'training', 'products', 'current_campaign', 'growth', 'logistics', 'marketing', 'finance'].map((k) => [k, 3]));
    expect(calculateBrandReadinessScore(makeSystems(all3))).toBe(25);
  });
  it('ignores non-Phase-1 systems even at Level 3', () => {
    expect(calculateBrandReadinessScore(makeSystems({ administration: 3, training: 3 }))).toBe(0);
  });
});


describe('getReadinessStage', () => {
  it('Emerging for 0', () => expect(getReadinessStage(0)).toBe('Emerging'));
  it('Established for 25', () => expect(getReadinessStage(25)).toBe('Established'));
  it('Advancing for 50', () => expect(getReadinessStage(50)).toBe('Advancing'));
  it('Scalable for 75', () => expect(getReadinessStage(75)).toBe('Scalable'));
  it('Exit Ready for 100', () => expect(getReadinessStage(100)).toBe('Exit Ready'));
});

describe('applyFloorRule', () => {
  it('caps at Established when marketing < Level 2', () => {
    const systems = makeSystems({ marketing: 1, finance: 3 });
    expect(applyFloorRule('Advancing', systems)).toBe('Established');
  });
  it('caps at Established when finance < Level 2', () => {
    const systems = makeSystems({ marketing: 3, finance: 1 });
    expect(applyFloorRule('Scalable', systems)).toBe('Established');
  });
  it('allows full stage when both marketing & finance >= Level 2', () => {
    const systems = makeSystems({ marketing: 2, finance: 2 });
    expect(applyFloorRule('Advancing', systems)).toBe('Advancing');
  });
});

describe('isScoreVisible', () => {
  it('hidden when no system at Level 2', () => {
    expect(isScoreVisible(makeSystems({ marketing: 1 }))).toBe(false);
  });
  it('visible when one system at Level 2', () => {
    expect(isScoreVisible(makeSystems({ marketing: 2 }))).toBe(true);
  });
});
