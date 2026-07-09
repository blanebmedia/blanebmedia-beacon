-- Remap existing stage labels to canonical names
UPDATE public.readiness_snapshots SET stage = 'Established' WHERE stage = 'Structured';
UPDATE public.readiness_snapshots SET stage = 'Advancing'   WHERE stage = 'Operational';

-- Rewrite snapshot trigger function with new stage labels and Phase 1 scoring
CREATE OR REPLACE FUNCTION public.record_readiness_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF r.system_key IN ('marketing', 'finance') THEN
      IF r.badge_level >= 3 THEN
        _score := _score + 12.5;
      ELSIF r.badge_level >= 2 THEN
        _score := _score + 6.25;
      END IF;
    END IF;
    IF r.system_key = 'marketing' THEN _marketing_lvl := r.badge_level; END IF;
    IF r.system_key = 'finance'   THEN _finance_lvl   := r.badge_level; END IF;
  END LOOP;

  IF _score >= 90 THEN _stage := 'Exit Ready';
  ELSIF _score >= 75 THEN _stage := 'Scalable';
  ELSIF _score >= 50 THEN _stage := 'Advancing';
  ELSIF _score >= 25 THEN _stage := 'Established';
  ELSE _stage := 'Emerging';
  END IF;

  IF (_marketing_lvl < 2) OR (_finance_lvl < 2) THEN
    IF _stage NOT IN ('Emerging', 'Established') THEN
      _stage := 'Established';
    END IF;
  END IF;

  INSERT INTO public.readiness_snapshots (business_id, score, stage)
  VALUES (NEW.business_id, _score, _stage);

  RETURN NEW;
END;
$function$;