
-- ========================================
-- Beacon Phase 1: Complete Schema
-- ========================================

-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own business" ON public.businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business" ON public.businesses FOR DELETE USING (auth.uid() = user_id);

-- 3. Systems
CREATE TABLE public.systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  system_key TEXT NOT NULL,
  is_activated BOOLEAN NOT NULL DEFAULT false,
  badge_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, system_key)
);
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;

-- 4. Checklist items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_id, item_key)
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- 5. Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- 6. Readiness snapshots
CREATE TABLE public.readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'Emerging',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.readiness_snapshots ENABLE ROW LEVEL SECURITY;

-- 7. Helper functions (tables exist now)
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner(_system_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.systems s JOIN public.businesses b ON b.id = s.business_id
    WHERE s.id = _system_id AND b.user_id = auth.uid()
  );
$$;

-- 8. RLS policies using helper functions
CREATE POLICY "Users can view own systems" ON public.systems FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "Users can insert own systems" ON public.systems FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "Users can update own systems" ON public.systems FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "Users can delete own systems" ON public.systems FOR DELETE USING (public.is_business_owner(business_id));

CREATE POLICY "Users can view own checklist items" ON public.checklist_items FOR SELECT USING (public.is_system_owner(system_id));
CREATE POLICY "Users can insert own checklist items" ON public.checklist_items FOR INSERT WITH CHECK (public.is_system_owner(system_id));
CREATE POLICY "Users can update own checklist items" ON public.checklist_items FOR UPDATE USING (public.is_system_owner(system_id));
CREATE POLICY "Users can delete own checklist items" ON public.checklist_items FOR DELETE USING (public.is_system_owner(system_id));

CREATE POLICY "Users can view own snapshots" ON public.readiness_snapshots FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "Users can insert own snapshots" ON public.readiness_snapshots FOR INSERT WITH CHECK (public.is_business_owner(business_id));

-- 9. Auto-create all user data on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _business_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  INSERT INTO public.businesses (user_id) VALUES (NEW.id) RETURNING id INTO _business_id;
  INSERT INTO public.systems (business_id, system_key) VALUES
    (_business_id, 'administration'), (_business_id, 'training'),
    (_business_id, 'products'), (_business_id, 'current_campaign'),
    (_business_id, 'growth'), (_business_id, 'logistics'),
    (_business_id, 'marketing'), (_business_id, 'finance');
  INSERT INTO public.checklist_items (system_id, item_key)
  SELECT s.id, ci.item_key FROM public.systems s
  CROSS JOIN (VALUES ('item_1'),('item_2'),('item_3'),('item_4'),('item_5')) AS ci(item_key)
  WHERE s.business_id = _business_id;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_systems_updated_at BEFORE UPDATE ON public.systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
