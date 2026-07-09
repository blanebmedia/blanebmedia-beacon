
-- 1. Profile fields on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS naics_code text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS years_in_business integer;

-- 2. Phase-1 guard: only marketing and finance may have interactive state changes.
CREATE OR REPLACE FUNCTION public.enforce_phase1_systems_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.system_key NOT IN ('marketing', 'finance') THEN
    -- Allow updates to updated_at only, block real state changes.
    IF (NEW.is_activated IS DISTINCT FROM OLD.is_activated)
       OR (NEW.badge_level IS DISTINCT FROM OLD.badge_level) THEN
      RAISE EXCEPTION 'System % is not active in Phase 1', NEW.system_key
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_phase1_systems_guard ON public.systems;
CREATE TRIGGER trg_enforce_phase1_systems_guard
BEFORE UPDATE ON public.systems
FOR EACH ROW EXECUTE FUNCTION public.enforce_phase1_systems_guard();

CREATE OR REPLACE FUNCTION public.enforce_phase1_checklist_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _system_key text;
BEGIN
  SELECT system_key INTO _system_key FROM public.systems WHERE id = NEW.system_id;
  IF _system_key IS NOT NULL AND _system_key NOT IN ('marketing', 'finance') THEN
    IF NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
      RAISE EXCEPTION 'Checklist for % is not active in Phase 1', _system_key
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_phase1_checklist_guard ON public.checklist_items;
CREATE TRIGGER trg_enforce_phase1_checklist_guard
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_phase1_checklist_guard();

-- 3. Automated readiness snapshots on badge_level change.
CREATE OR REPLACE FUNCTION public.record_readiness_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _score numeric := 0;
  _stage text := 'Emerging';
  _marketing_lvl int := 0;
  _finance_lvl int := 0;
  r record;
BEGIN
  IF NEW.badge_level IS NOT DISTINCT FROM OLD.badge_level THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT system_key, badge_level FROM public.systems WHERE business_id = NEW.business_id
  LOOP
    IF r.badge_level >= 3 THEN
      _score := _score + 12.5;
    ELSIF r.badge_level >= 2 THEN
      _score := _score + 6.25;
    END IF;
    IF r.system_key = 'marketing' THEN _marketing_lvl := r.badge_level; END IF;
    IF r.system_key = 'finance'   THEN _finance_lvl   := r.badge_level; END IF;
  END LOOP;

  IF _score >= 90 THEN _stage := 'Exit Ready';
  ELSIF _score >= 75 THEN _stage := 'Scalable';
  ELSIF _score >= 50 THEN _stage := 'Operational';
  ELSIF _score >= 25 THEN _stage := 'Structured';
  ELSE _stage := 'Emerging';
  END IF;

  -- Floor rule: cap at Structured unless marketing AND finance are Level 2+
  IF (_marketing_lvl < 2) OR (_finance_lvl < 2) THEN
    IF _stage NOT IN ('Emerging', 'Structured') THEN
      _stage := 'Structured';
    END IF;
  END IF;

  INSERT INTO public.readiness_snapshots (business_id, score, stage)
  VALUES (NEW.business_id, _score, _stage);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_readiness_snapshot ON public.systems;
CREATE TRIGGER trg_record_readiness_snapshot
AFTER UPDATE OF badge_level ON public.systems
FOR EACH ROW EXECUTE FUNCTION public.record_readiness_snapshot();
