"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Phone, Lock, HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "security">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      toast.error("Enter phone and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      if (res.ok) {
        document.cookie = "en-route-admin=true; path=/; max-age=86400";
        localStorage.setItem("en-route-admin", "true");
        toast.success("Welcome, Admin");
        router.push("/admin/users");
      } else {
        const data = await res.json();
        if (res.status === 429) {
          toast.error(data.error || "Too many attempts. Please wait.");
          return;
        }
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 2) {
          setStep("security");
          toast.error("Too many attempts. Answer the security question.");
        } else {
          toast.error(data.error || `Wrong password. ${2 - newAttempts} attempt(s) left.`);
        }
      }
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim()) {
      toast.error("Enter your answer");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), securityAnswer: securityAnswer.trim() }),
      });
      if (res.ok) {
        document.cookie = "en-route-admin=true; path=/; max-age=86400";
        localStorage.setItem("en-route-admin", "true");
        toast.success("Welcome, Admin");
        router.push("/admin/users");
      } else {
        const data = await res.json();
        if (res.status === 429) {
          toast.error(data.error || "Too many attempts. Please wait.");
        } else {
          toast.error(data.error || "Wrong answer");
        }
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-5">
      <Card className="w-full max-w-sm">
        <CardContent className="text-center py-8">
          <div className="w-14 h-14 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-bold mb-1">Admin Panel</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {step === "login" ? "Enter your admin credentials" : "Security verification"}
          </p>

          {step === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3 text-left" autoComplete="off">
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="tel"
                  placeholder="Admin phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition"
                />
              </div>
              {failedAttempts >= 1 && failedAttempts < 2 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Wrong password. 1 more attempt before security question.
                </p>
              )}
              <Button type="submit" loading={loading} className="w-full">
                Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSecurity} className="space-y-3 text-left">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                  <HelpCircle size={14} /> Security Question
                </p>
                <p className="text-sm text-amber-700 mt-1">Who is your favorite human?</p>
              </div>
              <input
                type="text"
                placeholder="Your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition"
              />
              <Button type="submit" loading={loading} className="w-full">
                Verify
              </Button>
              <button
                type="button"
                onClick={() => { setStep("login"); setFailedAttempts(0); setSecurityAnswer(""); }}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition py-2"
              >
                Back to login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
