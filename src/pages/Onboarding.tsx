import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { SYSTEMS_REGISTRY, type SystemKey, getSystemDefinition } from '@/modules/systems/registry';
import { calculateBadgeLevel, getBadgeLevelLabel, type BadgeLevel } from '@/modules/scoring/badge';
import { calculateReadiness } from '@/modules/scoring/score';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const INDUSTRIES = [
  'E-commerce', 'SaaS', 'Agency', 'Consulting', 'Healthcare',
  'Real Estate', 'Education', 'Food & Beverage', 'Manufacturing', 'Other',
];

type Step = 1 | 2 | 3 | 4 | 5;

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');

  // Step 3 state
  const [selectedSystem, setSelectedSystem] = useState<SystemKey | null>(null);

  // Step 4 state
  const [checklistItems, setChecklistItems] = useState<{ id: string; item_key: string; is_completed: boolean }[]>([]);
  const [systemId, setSystemId] = useState<string | null>(null);

  // Step 5 state
  const [scoreData, setScoreData] = useState<{ score: number; stage: string; visible: boolean } | null>(null);

  const progressPercent = (step / 5) * 100;

  // ── Step 2: Save business profile ──
  const handleSaveProfile = async () => {
    if (!businessName.trim() || !industry) {
      toast({ title: 'Missing fields', description: 'Please enter your business name and industry.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ name: businessName.trim(), industry })
        .eq('user_id', user!.id);
      if (error) throw error;
      setStep(3);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Activate chosen system ──
  const handleActivateSystem = async () => {
    if (!selectedSystem) return;
    setLoading(true);
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (!biz) throw new Error('Business not found');

      // Activate system
      const { data: sys } = await supabase
        .from('systems')
        .select('id')
        .eq('business_id', biz.id)
        .eq('system_key', selectedSystem)
        .single();
      if (!sys) throw new Error('System not found');

      await supabase
        .from('systems')
        .update({ is_activated: true })
        .eq('id', sys.id);

      setSystemId(sys.id);

      // Load checklist items for this system
      const { data: items } = await supabase
        .from('checklist_items')
        .select('id, item_key, is_completed')
        .eq('system_id', sys.id)
        .order('item_key');
      if (items) setChecklistItems(items);

      setStep(4);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Toggle checklist item ──
  const handleToggle = async (item: { id: string; item_key: string; is_completed: boolean }) => {
    const newCompleted = !item.is_completed;
    setChecklistItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i)));

    await supabase
      .from('checklist_items')
      .update({ is_completed: newCompleted })
      .eq('id', item.id);

    // Update badge level
    const updated = checklistItems.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i));
    const completedCount = updated.filter((i) => i.is_completed).length;
    const newBadge = calculateBadgeLevel(completedCount);
    if (systemId) {
      await supabase.from('systems').update({ badge_level: newBadge }).eq('id', systemId);
    }
  };

  // ── Step 4 → 5: Calculate score ──
  const handleProceedToScore = async () => {
    setLoading(true);
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (!biz) throw new Error('Business not found');

      const { data: allSystems } = await supabase
        .from('systems')
        .select('system_key, badge_level')
        .eq('business_id', biz.id);

      if (allSystems) {
        const input = allSystems.map((s) => ({
          systemKey: s.system_key as SystemKey,
          badgeLevel: s.badge_level as BadgeLevel,
        }));
        setScoreData(calculateReadiness(input));
      }
      setStep(5);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 5: Finish onboarding ──
  const handleFinish = async () => {
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user!.id);
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedDef = selectedSystem ? getSystemDefinition(selectedSystem) : null;
  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const badgeLevel = calculateBadgeLevel(completedCount);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of 5</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-display">Welcome to Beacon</CardTitle>
              <CardDescription className="text-base mt-2">
                Activate your first system to unlock your Brand Readiness Score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Beacon helps you assess and strengthen 8 core business systems — from Marketing and Finance to Administration and Growth.
              </p>
              <p className="text-sm text-muted-foreground">
                Complete checklists, earn badges, and watch your Brand Readiness evolve.
              </p>
              <Button className="w-full mt-4" onClick={() => setStep(2)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Business Profile ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-display">Your Business</CardTitle>
              <CardDescription>Tell us a bit about your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="biz-name">Business Name</Label>
                <Input
                  id="biz-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corp"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handleSaveProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Choose First System ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-display">Choose Your First System</CardTitle>
              <CardDescription>Select a system to activate. Marketing and Finance are great starting points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {SYSTEMS_REGISTRY.map((def) => (
                  <button
                    key={def.key}
                    onClick={() => setSelectedSystem(def.key)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      selectedSystem === def.key
                        ? 'border-accent bg-accent/10 ring-1 ring-accent'
                        : 'border-border hover:border-accent/40 hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{def.name}</p>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    {def.isCommonStartingPoint && (
                      <Badge variant="outline" className="ml-2 shrink-0 text-[10px] border-accent/50 text-accent">
                        Recommended
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleActivateSystem} disabled={!selectedSystem || loading}>
                  {loading ? 'Activating...' : 'Activate System'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Complete Checklist ── */}
        {step === 4 && selectedDef && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-display">{selectedDef.name} Checklist</CardTitle>
                  <CardDescription>Complete items to earn your first badge.</CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-accent text-accent">
                    {getBadgeLevelLabel(badgeLevel)}
                  </Badge>
                  <div className="mt-1 flex gap-0.5 justify-end">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-2 w-4 rounded-sm ${badgeLevel >= lvl ? 'bg-accent' : 'bg-border'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDef.checklist.map((checkDef) => {
                const itemData = checklistItems.find((i) => i.item_key === checkDef.key);
                const checked = itemData?.is_completed ?? false;
                const isInteractive = selectedDef.isActiveInPhase1;

                return (
                  <label
                    key={checkDef.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      !isInteractive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'
                    } ${checked ? 'border-accent/30 bg-accent/5' : 'border-border'}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!isInteractive}
                      onCheckedChange={() => itemData && handleToggle(itemData)}
                    />
                    <span className={`text-sm ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {checkDef.label}
                    </span>
                  </label>
                );
              })}

              <p className="text-xs text-muted-foreground mt-2">
                {completedCount}/5 completed · {completedCount < 3
                  ? `Complete ${3 - completedCount} more to unlock Brand Readiness`
                  : 'Brand Readiness unlocked!'}
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button className="flex-1" onClick={handleProceedToScore} disabled={loading}>
                  {loading ? 'Calculating...' : 'See Your Score'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Score Reveal ── */}
        {step === 5 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display">Your Brand Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              {scoreData?.visible ? (
                <>
                  <div>
                    <p className="text-6xl font-display font-bold text-accent">{scoreData.score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                  </div>
                  <Badge variant="outline" className="border-accent text-accent text-sm px-4 py-1">
                    {scoreData.stage}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Great start! Activate more systems and complete checklists to increase your score.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-medium text-foreground">Almost there!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete at least 3 checklist items in any system to unlock your Brand Readiness Score.
                    </p>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={handleFinish} disabled={loading}>
                {loading ? 'Loading...' : 'Go to Dashboard'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
