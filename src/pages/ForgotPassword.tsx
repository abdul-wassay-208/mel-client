import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Mail } from 'lucide-react';
import { apiForgotPassword } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await apiForgotPassword(email.trim().toLowerCase());
      setSent(true);
      if (res.email?.skipped) {
        toast({
          title: 'Email not configured on server',
          description: 'BREVO_API_KEY / BREVO_FROM_EMAIL are missing. Configure them to send real emails.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Failed to send reset link',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] animate-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-elevated mb-5">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">MEL Platform</h1>
          <p className="text-[15px] text-muted-foreground mt-1.5">Monitoring, Evaluation & Learning</p>
        </div>

        <div className="card-elevated p-8">
          <div className="mb-7">
            <h2 className="text-lg font-semibold">Reset Password</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Enter your email to receive reset instructions</p>
          </div>

          {sent ? (
            <div className="text-center py-6">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <p className="text-[15px] font-medium">Check your email</p>
              <p className="text-[13px] text-muted-foreground mt-1.5">We've sent reset instructions to {email}</p>
              <Button variant="outline" className="mt-5 h-10" onClick={() => navigate('/login')}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="field-label">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-12 text-[15px]"
                  required
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full h-12 text-[15px]">
                {sending ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-[13px] text-muted-foreground hover:text-foreground block text-center w-full transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

