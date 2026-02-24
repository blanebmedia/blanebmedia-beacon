import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        setView('login');
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link to verify your account.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold font-display text-foreground">Beacon</h1>
          <p className="mt-2 text-sm text-muted-foreground">Business Systems Readiness Platform</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {view === 'forgot' ? 'Reset Password' : view === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {view === 'forgot'
                ? "Enter your email and we'll send a reset link."
                : view === 'login'
                  ? 'Enter your credentials to access your dashboard.'
                  : 'Start your 14-day Founder Trial.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              {view !== 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? 'Loading...'
                  : view === 'forgot'
                    ? 'Send Reset Link'
                    : view === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
              </Button>
              {view === 'signup' && (
                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <a href="https://www.blanebmedia.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Terms of Service</a>{' '}
                  and{' '}
                  <a href="https://www.blanebmedia.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
                </p>
              )}
              {view === 'login' && (
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {view === 'forgot'
                  ? 'Back to Sign In'
                  : view === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
