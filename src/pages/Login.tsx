import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginSchema = z.object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
  });

  type LoginValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = async (values: LoginValues) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const user = await login(values.email, values.password);
      if (user) {
        navigate(user.role === 'admin' ? '/admin' : '/lead');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid credentials. Try admin@mel.org, james@mel.org, or maria@mel.org (password: "password")',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Login failed',
        description: getErrorMessage(err, 'Something went wrong. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      setForgotSent(true);
    } finally {
      setIsSending(false);
    }
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

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="email" className="field-label">Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                            <Input
                              {...field}
                              id="email"
                              type="email"
                              placeholder="you@example.com"
                              className={cn("pl-11 pr-10 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                              disabled={isLoading}
                            />
                            {fieldState.error && <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="password" className="field-label">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                            <Input
                              {...field}
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className={cn("pl-11 pr-20 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                              disabled={isLoading}
                            />
                            {fieldState.error && <AlertCircle className="absolute right-11 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                              disabled={isLoading}
                            >
                              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full h-12 text-[15px] font-medium">
                    {isLoading ? 'Signing In…' : 'Sign In'}
                  </Button>
                </form>
              </Form>

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
                  <Button type="submit" disabled={isSending} className="w-full h-12 text-[15px]">
                    {isSending ? 'Sending…' : 'Send Reset Link'}
                  </Button>
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
