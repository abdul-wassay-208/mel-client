import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Lock, AlertCircle } from "lucide-react";
import { apiGetInvite, apiAcceptInvite } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuthFromToken } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ name: string; email: string; role: "ADMIN" | "PROJECT_LEAD" } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => z.object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
  }).superRefine((val, ctx) => {
    if (val.password !== val.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Passwords do not match." });
    }
  }), []);

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await apiGetInvite(token);
        setInfo(data);
      } catch (err: any) {
        setError(err?.message || "This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (values: Values) => {
    if (!token || !info) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiAcceptInvite(token, values.password);
      const mappedRole = res.user.role === "ADMIN" ? "admin" : "project_lead";
      setAuthFromToken(
        {
          id: String(res.user.id),
          name: res.user.name,
          email: res.user.email,
          role: mappedRole,
        },
        res.token
      );
      toast({ title: "Account activated", description: "Your account has been activated successfully." });
      navigate(mappedRole === "admin" ? "/admin" : "/lead", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to activate your account.");
      toast({ title: "Activation failed", description: getErrorMessage(err, "Failed to activate your account."), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[480px] animate-in">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-elevated mb-5">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">MEL Platform</h1>
          <p className="text-[15px] text-muted-foreground mt-1.5">Invitation Activation</p>
        </div>

        <div className="card-elevated p-8">
          {error && (
            <div className="mb-5 text-[13px] text-destructive bg-destructive/8 rounded-lg px-4 py-3 border border-destructive/15">
              {error}
            </div>
          )}

          {!info ? (
            <p className="text-[14px] text-muted-foreground">
              This invite link is invalid or has expired. Please contact your administrator.
            </p>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-lg font-semibold">Set your password</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Welcome {info.name}. Create a password to activate your account for {info.email}.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="password" className="field-label">New password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                            <Input
                              {...field}
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              className={cn("pl-11 pr-10 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                              disabled={submitting}
                            />
                            {fieldState.error && <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                          </div>
                        </FormControl>
                        <p className="text-[12px] text-muted-foreground">
                          Minimum 8 characters. Use a strong password you don&apos;t use elsewhere.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="confirm" className="field-label">Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              id="confirm"
                              type="password"
                              placeholder="••••••••"
                              className={cn("pr-10 h-12 text-[15px]", fieldState.error && "border-destructive focus-visible:ring-destructive")}
                              disabled={submitting}
                            />
                            {fieldState.error && <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-destructive" />}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 text-[15px] font-medium" disabled={submitting}>
                    {submitting ? "Activating..." : "Activate Account"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

