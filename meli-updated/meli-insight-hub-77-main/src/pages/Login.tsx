import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    const user = login(email, password);
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/lead');
    } else {
      setError('Invalid credentials. Try admin@mel.org, james@mel.org, or maria@mel.org');
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] animate-in">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-elevated mb-5">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">MEL Platform</h1>
          <p className="text-[15px] text-muted-foreground mt-1.5">Monitoring, Evaluation & Learning</p>
        </div>

        <div className="card-elevated p-8">
          {!showForgot ? (
            <>
              <div className="mb-7">
                <h2 className="text-lg font-semibold">Welcome back</h2>
                <p className="text-[13px] text-muted-foreground mt-1">Sign in to your account to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="field-label">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-11 h-12 text-[15px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="field-label">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 text-[15px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-destructive bg-destructive/8 rounded-lg px-4 py-3 border border-destructive/15">{error}</p>
                )}

                <Button type="submit" className="w-full h-12 text-[15px] font-medium">
                  Sign In
                </Button>
              </form>

              <button
                onClick={() => setShowForgot(true)}
                className="text-[13px] text-primary hover:text-primary/80 mt-5 block text-center w-full transition-colors"
              >
                Forgot your password?
              </button>

              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                  Demo accounts: <span className="font-medium text-foreground">admin@mel.org</span> · <span className="font-medium text-foreground">james@mel.org</span> · <span className="font-medium text-foreground">maria@mel.org</span>
                  <br />
                  <span className="text-muted-foreground/60">Any password works</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-lg font-semibold">Reset Password</h2>
                <p className="text-[13px] text-muted-foreground mt-1">Enter your email to receive reset instructions</p>
              </div>

              {forgotSent ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-[15px] font-medium">Check your email</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5">We've sent reset instructions to {forgotEmail}</p>
                  <Button variant="outline" className="mt-5 h-10" onClick={() => { setShowForgot(false); setForgotSent(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="field-label">Email address</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="h-12 text-[15px]"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-[15px]">Send Reset Link</Button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="text-[13px] text-muted-foreground hover:text-foreground block text-center w-full transition-colors"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
