"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Trophy, Copy, ArrowLeft, Star, Phone, LogIn, AlertCircle, MessageCircle, Home, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { maskFullName } from "@/lib/privacy";

interface MemberResult {
  type: "member" | "head";
  member_id: string | null;
  name: string;
  phone: string;
  household_head: string;
  household_registration_id: string | null;
  zone: string | null;
  zone_prefix: string | null;
  head_verification_status: string;
  head_points: number;
  referral_code: string | null;
  head_id: string;
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [requestingIndependence, setRequestingIndependence] = useState(false);
  const [pendingIndependence, setPendingIndependence] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("en-route-member-phone");
    if (saved) {
      setQuery(saved);
      handleSearch(saved);
    }
  }, []);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/member/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        if (data.results.length === 1) {
          selectMember(data.results[0]);
        } else {
          setShowLoginForm(false);
        }
      } else {
        toast.error("No account found. Try a different name or phone number.");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const selectMember = async (member: MemberResult) => {
    setSelectedMember(member);
    setShowLoginForm(false);
    localStorage.setItem("en-route-member-phone", member.phone);

    // Fetch referral count if head
    if (member.type === "head" && member.head_id) {
      const supabase = createClient();
      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", member.head_id);
      setReferralCount(count || 0);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("en-route-member-phone");
    setSelectedMember(null);
    setSearchResults([]);
    setShowLoginForm(true);
    setQuery("");
  };

  const handleRequestIndependence = async () => {
    if (!selectedMember) return;
    setRequestingIndependence(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("update_requests").insert({
        user_id: selectedMember.head_id,
        field: "independent_household",
        new_value: "I would like to manage my own independent household.",
      });
      if (error) throw error;
      setPendingIndependence(true);
      toast.success("Independence request submitted. Admin will review.");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setRequestingIndependence(false);
    }
  };

  const copyReferralLink = () => {
    if (!selectedMember?.referral_code) return;
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${selectedMember.referral_code}`);
    toast.success("Referral link copied!");
  };

  const shareReferralWhatsApp = () => {
    if (!selectedMember?.referral_code) return;
    const url = `${window.location.origin}/register?ref=${selectedMember.referral_code}`;
    const message = encodeURIComponent(`Hey! I use En-Route to register my household address in Ukhrul. Register yours here:\n\n${url}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending_verification: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
    verified: { label: "Verified", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    needs_clarification: { label: "Needs Info", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  };

  // Login / Search Form
  if (showLoginForm) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-5">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" size={28} />
              </div>
              <h1 className="text-xl font-bold mb-1">Household Member</h1>
              <p className="text-sm text-[var(--text-secondary)]">Search by phone number or name</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="space-y-3"
            >
              <Input
                placeholder="Phone number or full name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                <LogIn size={16} className="mr-2" /> Search
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
                Household Head login instead
              </Link>
              <p className="text-xs text-[var(--text-secondary)]">
                Not registered?{" "}
                <Link href="/register" className="text-[var(--primary)] hover:underline">Register now</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Multiple results — show selection
  if (searchResults.length > 1 && !selectedMember) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-lg mx-auto px-5 py-8">
          <button onClick={() => { setShowLoginForm(true); setSearchResults([]); }} className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-xl font-bold mb-4">Select your account</h1>
          <div className="space-y-3">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectMember(r)}
                className="w-full text-left"
              >
                <Card className="hover:border-[var(--primary)] transition">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{maskFullName(r.name)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{r.household_registration_id || "No ID"} • {r.zone || "No zone"}</p>
                      </div>
                      <span className="text-xs text-[var(--primary)] font-medium">{r.type === "head" ? "Head" : "Member"}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!selectedMember) return null;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Member Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
              <ArrowLeft size={18} />
            </Link>
            <button onClick={handleLogout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)]">
              Logout
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold">{maskFullName(selectedMember.name)}</p>
              <p className="text-sm text-white/80">{selectedMember.phone.slice(0, 2)}xxxx{selectedMember.phone.slice(-2)}</p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/20">
              {selectedMember.type === "head" ? "Household Head" : "Member"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <Home size={20} className="mx-auto mb-1 text-white/80" />
              <p className="text-sm font-bold">{selectedMember.household_registration_id || "—"}</p>
              <p className="text-xs text-white/70">Registration ID</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-sm font-bold">{selectedMember.zone || "—"}</p>
              <p className="text-xs text-white/70">Zone</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold">{selectedMember.head_points}</p>
              <p className="text-xs text-white/70">Points</p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Registration Status</span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusConfig[selectedMember.head_verification_status]?.bg || "bg-gray-50 border-gray-200"} ${statusConfig[selectedMember.head_verification_status]?.color || "text-gray-700"}`}>
                {statusConfig[selectedMember.head_verification_status]?.label || selectedMember.head_verification_status}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Household Info */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Home size={16} /> Household Information
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Household Head</span>
              <span className="font-medium">{maskFullName(selectedMember.household_head)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Registration ID</span>
              <span className="font-mono font-medium text-[var(--primary)]">{selectedMember.household_registration_id || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Zone</span>
              <span className="font-medium">{selectedMember.zone || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Request Independent Household */}
        {selectedMember.type === "member" && (
          <Card className="mb-6 border-orange-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck size={16} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800 mb-1">Independent Household</p>
                  <p className="text-xs text-orange-700 mb-3">
                    Request your own household registration. You&apos;ll be removed from this household and receive your own Registration ID.
                  </p>
                  {pendingIndependence ? (
                    <p className="text-xs text-orange-600 font-medium">Request pending admin review.</p>
                  ) : (
                    <button
                      onClick={handleRequestIndependence}
                      disabled={requestingIndependence}
                      className="text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition"
                    >
                      {requestingIndependence ? "Submitting..." : "Request Independent Household"}
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Section */}
        {selectedMember.referral_code && (
          <Card className="mb-6 border-[var(--primary)]/20">
            <CardHeader className="bg-[var(--primary)]/5">
              <h2 className="font-semibold text-sm text-[var(--primary)]">Invite via Referral</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Referral Count</span>
                <span className="font-bold text-[var(--primary)]">{selectedMember.type === "head" ? referralCount : 0}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Share your link. Earn +10 points for each registration.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 px-3 py-2.5 rounded-lg truncate border border-[var(--border)] font-mono">
                  {typeof window !== "undefined" ? `${window.location.origin}/register?ref=${selectedMember.referral_code}` : ""}
                </code>
                <Button size="sm" onClick={copyReferralLink}><Copy size={14} /></Button>
              </div>
              <button
                onClick={shareReferralWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white py-3 rounded-xl text-sm font-medium transition active:scale-[0.98]"
              >
                <MessageCircle size={16} /> Share on WhatsApp
              </button>
              <a href="https://whatsapp.com/channel/0029Vb42kD0HFxPA8UGJRF3i" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 py-3 rounded-xl text-sm font-medium transition hover:bg-green-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Join WhatsApp Channel
              </a>
            </CardContent>
          </Card>
        )}

        {/* Contribution Summary */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Contribution Summary
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Household Points</span>
                <span className="font-medium text-[var(--primary)]">{selectedMember.head_points}</span>
              </div>
              {selectedMember.type === "head" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Referral Bonus</span>
                  <span className="font-medium text-[var(--primary)]">+{referralCount * 10}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ad Banners */}
        <div className="pt-2">
          <div className="text-center text-xs text-[var(--text-secondary)] py-4">
            En-Route — Household Address Registry
          </div>
        </div>
      </div>
    </main>
  );
}
