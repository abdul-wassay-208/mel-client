import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Lock } from "lucide-react";
import { apiGetInvite, apiAcceptInvite } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuthFromToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ name: string; email: string; role: "ADMIN" | "PROJECT_LEAD" } | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !info) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiAcceptInvite(token, password);
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
      navigate(mappedRole === "admin" ? "/admin" : "/lead", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to activate your account.");
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="field-label">
                    New password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/60" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 text-[15px]"
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Minimum 8 characters. Use a strong password you don&apos;t use elsewhere.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="field-label">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 text-[15px]"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-[15px] font-medium" disabled={submitting}>
                  {submitting ? "Activating..." : "Activate Account"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

