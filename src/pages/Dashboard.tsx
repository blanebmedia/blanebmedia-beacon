import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { SYSTEMS_REGISTRY, type SystemKey } from '@/modules/systems/registry';
import { calculateBadgeLevel, getBadgeLevelLabel, type BadgeLevel } from '@/modules/scoring/badge';
import { calculateReadiness } from '@/modules/scoring/score';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SystemData {
  id: string;
  system_key: SystemKey;
  is_activated: boolean;
  badge_level: number;
  completed_count: number;
}

interface SubscriptionData {
  status: string;
  trial_end: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkOnboardingAndLoad();
  }, [user]);

  const checkOnboardingAndLoad = async () => {
    // Check if onboarding is completed
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user!.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    loadDashboard();
  };

  const loadDashboard = async () => {
    try {
      // Load business
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('user_id', user!.id)
        .single();

      if (biz) {
        setBusinessName(biz.name || 'Your Business');

        // Load systems with checklist counts
        const { data: systemRows } = await supabase
          .from('systems')
          .select('id, system_key, is_activated, badge_level')
          .eq('business_id', biz.id);

        if (systemRows) {
          const withCounts = await Promise.all(
            systemRows.map(async (s) => {
              const { count } = await supabase
                .from('checklist_items')
                .select('*', { count: 'exact', head: true })
                .eq('system_id', s.id)
                .eq('is_completed', true);
              return { ...s, system_key: s.system_key as SystemKey, completed_count: count ?? 0 };
            })
          );
          setSystems(withCounts);
        }
      }

      // Load subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_end')
        .eq('user_id', user!.id)
        .single();
      if (sub) setSubscription(sub);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const activatedCount = systems.filter((s) => s.is_activated).length;
  const readinessInput = systems.map((s) => ({
    systemKey: s.system_key,
    badgeLevel: s.badge_level as BadgeLevel,
  }));
  const { score, stage, visible } = calculateReadiness(readinessInput);

  const statusLabel = subscription?.status === 'active' ? 'Active' : subscription?.status === 'paused' ? 'Paused' : 'Trialing';
  const statusVariant = subscription?.status === 'active' ? 'default' : subscription?.status === 'paused' ? 'destructive' : 'secondary';

  // Suggested next system
  const suggestNext = (): { key: SystemKey; reason: string } | null => {
    if (!systems.some((s) => s.badge_level >= 2)) return null;
    const finance = systems.find((s) => s.system_key === 'finance');
    const marketing = systems.find((s) => s.system_key === 'marketing');
    if (finance && finance.badge_level < 2) return { key: 'finance', reason: 'Finance is essential for your Brand Readiness stage progression.' };
    if (marketing && marketing.badge_level < 2) return { key: 'marketing', reason: 'Marketing readiness unlocks higher Readiness stages.' };
    return { key: 'administration', reason: 'Administration strengthens your operational foundation.' };
  };
  const suggestion = suggestNext();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Beacon</h1>
            <p className="text-sm text-muted-foreground">{businessName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Score Section */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardDescription>Brand Readiness Score</CardDescription>
              <CardTitle className="text-4xl font-display">
                {visible ? (
                  <span className="text-accent">{score.toFixed(1)}<span className="text-2xl text-muted-foreground">/100</span></span>
                ) : (
                  <span className="text-muted-foreground text-lg">Activate a system to calculate</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visible && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Readiness Stage:</span>
                  <Badge variant="outline" className="border-accent text-accent">{stage}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Systems Activated</CardDescription>
              <CardTitle className="text-4xl font-display">{activatedCount}<span className="text-2xl text-muted-foreground">/8</span></CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Suggestion */}
        {suggestion && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-foreground">Suggested Next: {SYSTEMS_REGISTRY.find(s => s.key === suggestion.key)?.name}</p>
                <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/system/${suggestion.key}`)}>
                View System
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 8-System Grid */}
        <div>
          <h2 className="mb-4 text-xl font-display font-semibold text-foreground">Business Systems</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SYSTEMS_REGISTRY.map((def) => {
              const data = systems.find((s) => s.system_key === def.key);
              const isActivated = data?.is_activated ?? false;
              const badgeLevel = (data?.badge_level ?? 0) as BadgeLevel;
              const levelLabel = getBadgeLevelLabel(badgeLevel);

              return (
                <Card
                  key={def.key}
                  className={`transition-all ${isActivated ? 'cursor-pointer hover:shadow-md hover:border-accent/50' : 'opacity-75'}`}
                  onClick={() => {
                    if (isActivated || def.isActiveInPhase1) navigate(`/system/${def.key}`);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-sans font-semibold">{def.name}</CardTitle>
                      {def.isCommonStartingPoint && (
                        <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">Starting Point</Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isActivated ? levelLabel : 'Activating Soon'}
                      </span>
                      {isActivated && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-2 w-4 rounded-sm ${badgeLevel >= lvl ? 'bg-accent' : 'bg-border'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
