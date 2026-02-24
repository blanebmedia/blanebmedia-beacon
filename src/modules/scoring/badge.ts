// Badge level calculation from checklist completion count

export type BadgeLevel = 0 | 1 | 2 | 3;

export function calculateBadgeLevel(completedCount: number): BadgeLevel {
  if (completedCount >= 5) return 3;
  if (completedCount >= 3) return 2;
  if (completedCount >= 1) return 1;
  return 0;
}

export function getBadgeLevelLabel(level: BadgeLevel): string {
  switch (level) {
    case 0: return 'Not Activated';
    case 1: return 'Activated';
    case 2: return 'Structured';
    case 3: return 'Operational';
  }
}
