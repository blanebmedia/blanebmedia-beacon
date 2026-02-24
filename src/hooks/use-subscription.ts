import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface SubscriptionState {
  subscribed: boolean;
  status: 'trialing' | 'active' | 'paused' | 'none';
  trialEnd: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    status: 'none',
    trialEnd: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkNow = useCallback(async () => {
    if (!session?.access_token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setState({
        subscribed: data.subscribed ?? false,
        status: data.status ?? 'none',
        trialEnd: data.trial_end ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch (err) {
      console.error('check-subscription error:', err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkNow();
    const interval = setInterval(checkNow, 60_000);
    return () => clearInterval(interval);
  }, [checkNow]);

  return { ...state, checkNow };
}
