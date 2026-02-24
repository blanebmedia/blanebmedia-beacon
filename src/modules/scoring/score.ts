// Brand Readiness Score calculation + Readiness Stage mapping

import type { BadgeLevel } from './badge';
import type { SystemKey } from '../systems/registry';

export type ReadinessStage = 'Emerging' | 'Structured' | 'Operational' | 'Scalable' | 'Exit Ready';

export interface SystemScore {
  systemKey: SystemKey;
  badgeLevel: BadgeLevel;
}

/**
 * Each system contributes:
 * - Level 0,1 → 0 points
 * - Level 2   → 6.25 points
 * - Level 3   → 12.5 points
 * Max score = 8 × 12.5 = 100
 */
export function calculateBrandReadinessScore(systems: SystemScore[]): number {
  return systems.reduce((total, s) => {
    if (s.badgeLevel >= 3) return total + 12.5;
    if (s.badgeLevel >= 2) return total + 6.25;
    return total;
  }, 0);
}

/** Returns true if at least one system is at Level 2+ */
export function isScoreVisible(systems: SystemScore[]): boolean {
  return systems.some((s) => s.badgeLevel >= 2);
}

/** Map score to stage label */
export function getReadinessStage(score: number): ReadinessStage {
  if (score >= 90) return 'Exit Ready';
  if (score >= 75) return 'Scalable';
  if (score >= 50) return 'Operational';
  if (score >= 25) return 'Structured';
  return 'Emerging';
}

/**
 * Floor rule: stage cannot exceed "Structured" unless both
 * Marketing AND Finance are at Level 2+.
 */
export function applyFloorRule(
  stage: ReadinessStage,
  systems: SystemScore[]
): ReadinessStage {
  const marketing = systems.find((s) => s.systemKey === 'marketing');
  const finance = systems.find((s) => s.systemKey === 'finance');

  const marketingReady = marketing && marketing.badgeLevel >= 2;
  const financeReady = finance && finance.badgeLevel >= 2;

  if (!marketingReady || !financeReady) {
    // Cap at Structured
    const stageOrder: ReadinessStage[] = ['Emerging', 'Structured', 'Operational', 'Scalable', 'Exit Ready'];
    const cappedIndex = Math.min(stageOrder.indexOf(stage), 1); // 1 = Structured
    return stageOrder[cappedIndex];
  }

  return stage;
}

/** Full calculation: score → stage → floor rule applied */
export function calculateReadiness(systems: SystemScore[]): {
  score: number;
  stage: ReadinessStage;
  visible: boolean;
} {
  const score = calculateBrandReadinessScore(systems);
  const rawStage = getReadinessStage(score);
  const stage = applyFloorRule(rawStage, systems);
  const visible = isScoreVisible(systems);
  return { score, stage, visible };
}
