## Plan: Address Claude.ai's Foundation Concerns

### 1. Expand business profile schema (Phase 1 data capture gap)

Add the missing fields to `businesses` so the first 100 businesses produce complete records:

- `naics_code` (text)
- `zip_code` (text)
- `team_size` (text, bucketed: 1, 2-5, 6-10, 11-25, 26-50, 51+)
- `revenue_range` (text, bucketed: <$100k, $100k-$500k, $500k-$1M, $1M-$5M, $5M+)
- `years_in_business` (integer)

Migration adds the columns (all nullable to avoid breaking existing rows), keeps existing RLS/grants intact.

**Onboarding flow update (`src/pages/Onboarding.tsx`):**
Insert a new step between "business basics" and "system activation" that collects the 5 new fields. Keep it short, executive-tone, single screen. Mark all required so Phase 1 cohort data is complete from day one.

### 2. Automated readiness snapshots (Phase 3 trend data starts now)

Today scores are recalculated client-side and only persisted manually. Fix by writing a snapshot whenever badge level changes (the only moment the score can move per scoring rules).

Options — recommend **A**:

- **A. Postgres trigger on `systems.badge_level` UPDATE** — calls a `SECURITY DEFINER` function that recomputes the business's score+stage from current `systems` rows and inserts a row into `readiness_snapshots`. Guaranteed capture, no client dependency.
- B. Edge function called from client after badge change — less reliable.

Plan uses A. Trigger fires only when `NEW.badge_level <> OLD.badge_level`, so no snapshot spam.

Also add a daily `pg_cron` job (optional, Phase 1.5) that snapshots all businesses once for baseline continuity — flagged but not built in this pass unless you want it now.

### 3. Phase-1 inactive systems must not corrupt scores

Currently the 6 inactive systems still have checklist rows seeded by `handle_new_user`, and a user could toggle them and have it count.

Fixes:
- Add `is_active_in_phase` (boolean, default based on system_key) to `systems` OR keep registry as source of truth and enforce at write time.
- **Recommended:** add a DB-level guard — trigger on `checklist_items` and `systems` that rejects updates when the parent system_key is not in (`marketing`, `finance`). This makes the rule unbypassable.
- Client: `SystemChecklist.tsx` already should gate, but add an explicit read-only render + disabled checkboxes for non-active systems, with the "Activating Soon" label per project knowledge.
- Scoring: `calculateBrandReadinessScore` filters to active systems only (defensive — currently it sums all). This prevents any pre-existing dirty data from inflating scores.

### 4. The `.env` "exposure"

Clarification: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) are **publishable by design** — they're embedded in every Vite bundle the browser downloads. They are not secrets. RLS is what protects data, and your policies are in place. No rotation needed and they cannot be hidden from a frontend app.

What we will still do:
- Confirm no `SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or other true secrets are in `.env` or anywhere in the repo. (They're stored as Lovable Cloud secrets — confirmed in context.)
- Add `.env` to `.gitignore` anyway as hygiene, since Lovable regenerates it locally per environment.
- Run the security scanner after the migration to verify RLS is airtight on the new columns.

If you want the anon key rotated anyway for peace of mind, I can do it — but it will not change the security posture.

### Execution order

1. Migration: add 5 profile columns + snapshot trigger function + trigger + phase-1 guard trigger.
2. Update `Onboarding.tsx` with the new profile step.
3. Update `SystemChecklist.tsx` and `score.ts` to enforce active-systems-only.
4. Add `.env` to `.gitignore`.
5. Run security scanner; address any findings.

### Out of scope (flagged for later)

- Daily cron baseline snapshots (Phase 1.5).
- Backfilling profile fields for any existing test accounts — they'll need to re-complete onboarding or be wiped.
- Trend visualization UI (Phase 3 per roadmap).
