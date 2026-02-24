import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { getSystemDefinition, type SystemKey } from '@/modules/systems/registry';
import { calculateBadgeLevel, getBadgeLevelLabel, type BadgeLevel } from '@/modules/scoring/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItemData {
  id: string;
  item_key: string;
  is_completed: boolean;
}

const SystemChecklist = () => {
  const { systemKey } = useParams<{ systemKey: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItemData[]>([]);
  const [systemId, setSystemId] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [loading, setLoading] = useState(true);

  const def = (() => {
    try { return getSystemDefinition(systemKey as SystemKey); }
    catch { return null; }
  })();

  useEffect(() => {
    if (!user || !def) return;
    loadSystem();
  }, [user, systemKey]);

  const loadSystem = async () => {
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (!biz) return;

      const { data: sys } = await supabase
        .from('systems')
        .select('id, is_activated, badge_level')
        .eq('business_id', biz.id)
        .eq('system_key', systemKey!)
        .single();
      if (!sys) return;

      setSystemId(sys.id);
      setIsActivated(sys.is_activated);

      const { data: checklistRows } = await supabase
        .from('checklist_items')
        .select('id, item_key, is_completed')
        .eq('system_id', sys.id)
        .order('item_key');

      if (checklistRows) setItems(checklistRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!systemId) return;
    // Check activation cap
    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user!.id)
      .single();
    if (!biz) return;

    const { count: activatedCount } = await supabase
      .from('systems')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .eq('is_activated', true);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user!.id)
      .single();

    if (sub?.status === 'trialing' && (activatedCount ?? 0) >= 2) {
      toast({
        title: 'Activation Limit',
        description: "You've activated 2 systems during your Founder Trial. Subscribe to activate all 8 systems.",
        variant: 'destructive',
      });
      return;
    }

    await supabase
      .from('systems')
      .update({ is_activated: true })
      .eq('id', systemId);
    setIsActivated(true);
    toast({ title: 'System Activated', description: `${def?.name} is now active.` });
  };

  const handleToggle = async (item: ChecklistItemData) => {
    if (!def?.isActiveInPhase1 || !isActivated) return;

    const newCompleted = !item.is_completed;
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i)));

    await supabase
      .from('checklist_items')
      .update({ is_completed: newCompleted })
      .eq('id', item.id);

    // Recalculate badge
    const newItems = items.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i));
    const completedCount = newItems.filter((i) => i.is_completed).length;
    const newBadge = calculateBadgeLevel(completedCount);

    await supabase
      .from('systems')
      .update({ badge_level: newBadge })
      .eq('id', systemId);
  };

  if (!def) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">System not found.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.is_completed).length;
  const badgeLevel = calculateBadgeLevel(completedCount) as BadgeLevel;
  const isReadOnly = !def.isActiveInPhase1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">{def.name}</h1>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-sans">{def.name}</CardTitle>
                <CardDescription>{def.description}</CardDescription>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-accent text-accent">
                  {getBadgeLevelLabel(badgeLevel)}
                </Badge>
                <div className="mt-2 flex gap-0.5 justify-end">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-2 w-5 rounded-sm ${badgeLevel >= lvl ? 'bg-accent' : 'bg-border'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isActivated && !isReadOnly && (
              <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
                <p className="mb-2 text-sm text-muted-foreground">This system is not yet activated.</p>
                <Button onClick={handleActivate}>Activate {def.name}</Button>
              </div>
            )}

            {isReadOnly && (
              <div className="mb-6 rounded-lg border border-border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Preview only — this system will be available in a future update.</p>
              </div>
            )}

            <div className="space-y-3">
              {def.checklist.map((checkDef, idx) => {
                const itemData = items.find((i) => i.item_key === checkDef.key);
                const checked = itemData?.is_completed ?? false;
                const disabled = isReadOnly || !isActivated;

                return (
                  <label
                    key={checkDef.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'
                    } ${checked ? 'border-accent/30 bg-accent/5' : 'border-border'}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => itemData && handleToggle(itemData)}
                    />
                    <span className={`text-sm ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {checkDef.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              {completedCount}/5 items completed
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SystemChecklist;
