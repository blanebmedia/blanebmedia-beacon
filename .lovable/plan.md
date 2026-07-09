## Goal

Rename Readiness **Stages** to match the canonical spec. Badge level names/points and floor-rule mechanics stay the same — only the stage labels at 25–49 and 50–74 change.

## Canonical spec (source of truth)

Badge levels (unchanged):
- L0 Not Activated (0 pts), L1 Activated (0 pts), L2 Structured (6.25 pts), L3 Operational (12.5 pts)

Readiness Stages (rename):
- 0–24 Emerging
- 25–49 **Established** (was "Structured")
- 50–74 **Advancing** (was "Operational")
- 75–89 Scalable
- 90–100 Exit Ready

Floor rule: cap at **Established** unless both Marketing and Finance are Badge Level 2+.

## Changes

### 1. Scoring module (`src/modules/scoring/score.ts`)
- `ReadinessStage` type: `'Emerging' | 'Established' | 'Advancing' | 'Scalable' | 'Exit Ready'`
- `getReadinessStage`: return `'Established'` at ≥25, `'Advancing'` at ≥50
- `applyFloorRule`: cap at `'Established'`; update `stageOrder` array

### 2. Tests (`src/modules/scoring/__tests__/scoring.test.ts`)
- Update expectations: 25 → `Established`, 50 → `Advancing`, floor-rule caps → `Established`

### 3. Database migration
- `businesses.stage` default stays `'Emerging'` (no change to existing rows required, but we'll add a one-shot UPDATE to remap any existing `'Structured'` → `'Established'` and `'Operational'` → `'Advancing'` in `businesses.stage` and `readiness_snapshots.stage`)
- Rewrite the snapshot trigger function from migration `20260709063835` so its stage mapping uses `Established`/`Advancing` and the floor rule caps at `Established`

### 4. UI surfaces
- Grep-and-replace stage strings in any component that renders them (dashboard header, stage pill). Only the 25–49 and 50–74 labels change. Badge label strings (`Structured`, `Operational`) stay put in `badge.ts`.

### 5. Memory
- Update `mem://logic/readiness-stages` to reflect the new labels and floor-rule cap wording.

## Out of scope
- Badge naming, point values, weighting, or floor-rule threshold logic
- Onboarding flow, business profile schema, Phase-1 guards (already shipped)
- Backfilling historical snapshots beyond the label remap

## Technical details

Files touched:
- `src/modules/scoring/score.ts` (type + two functions)
- `src/modules/scoring/__tests__/scoring.test.ts` (expected strings)
- New migration: rewrite `record_readiness_snapshot()` + `UPDATE businesses SET stage=...` + `UPDATE readiness_snapshots SET stage=...`
- Any `.tsx` files under `src/` that hardcode the old stage strings (to be enumerated during build)
- `mem://logic/readiness-stages`

Note: `badge.ts` `case 2: 'Structured'` / `case 3: 'Operational'` are **badge** labels and remain unchanged — they are distinct from stage labels despite the collision.
