"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Trophy, Copy, ArrowLeft, Star, Send, CheckCircle, Clock, XCircle, Phone, LogIn, AlertCircle, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { AdBanner } from "@/components/AdBanner";
import { createClient } from "@/lib/supabase/client";
import { getPointsBreakdown } from "@/lib/points";

interface UserData {
  id: string;
  full_name: string;
  phone: string;
  points: number;
  referral_code: string;
  verification_status: string;
  clarification_note: string | null;
  photos: string[];
  location_desc: string;
  maps_link: string;
  house_type: string | null;
  head_user_id: string | null;
}

interface HouseholdMember {
  id: string;
  name: string;
  phone: string;
  promoted_user_id: string | null;
}

interface LeaderboardEntry {
  referral_count: number;
  full_name: string;
}

interface UpdateRequest {
  id: string;
  field: string;
  new_value: string;
  status: string;
  created_at: string;
}

const updateFields = [
  { key: "full_name", label: "Full Name" },
  { key: "phone", label: "Phone Number" },
  { key: "maps_link", label: "Google Maps Link" },
  { key: "location_desc", label: "Location Description" },
  { key: "photos", label: "Upload New Photo" },
  { key: "delete_photos", label: "Delete Old Photos" },
  { key: "manual", label: "Write Custom Request" },
  { key: "add_member", label: "Add Household Member" },
  { key: "remove_member", label: "Remove Household Member" },
];

const statusIcon: Record<string, typeof CheckCircle> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const statusColor: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50",
  approved: "text-green-600 bg-green-50",
  rejected: "text-red-600 bg-red-50",
};

export default function DashboardPage() {
  const router = useRouter();
  const [phoneInput, setPhoneInput] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [independencePendingMemberIds, setIndependencePendingMemberIds] = useState<string[]>([]);
  const [headName, setHeadName] = useState<string | null>(null);
  const [pendingIndependence, setPendingIndependence] = useState(false);
  const [requestingIndependence, setRequestingIndependence] = useState(false);
  const [totalHouseholds, setTotalHouseholds] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const [updateField, setUpdateField] = useState("");
  const [updateValue, setUpdateValue] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [requestPhoto, setRequestPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem("en-route-phone");
    if (savedPhone) {
      setPhoneInput(savedPhone);
      loginWithPhone(savedPhone);
    }
  }, []);

  const loginWithPhone = async (phone: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("phone", phone.trim())
        .single();

      if (!userData) {
        toast.error("No account found with this phone number");
        setLoading(false);
        return;
      }

      setUser(userData);
      setEditPhotos(userData.photos || []);
      setShowLoginForm(false);
      localStorage.setItem("en-route-phone", phone.trim());

      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      setTotalHouseholds(count || 0);

      const { count: refs } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", userData.id);
      setReferralCount(refs || 0);

      const { data: memberData } = await supabase.from("household_members").select("*").eq("user_id", userData.id).order("created_at");
      if (memberData) setMembers(memberData);

      // Flag members who have requested independence (their promoted account has a pending request).
      const promotedIds = (memberData || []).filter((m) => m.promoted_user_id).map((m) => m.promoted_user_id);
      if (promotedIds.length > 0) {
        const { data: indepReqs } = await supabase
          .from("update_requests")
          .select("user_id")
          .in("user_id", promotedIds)
          .eq("field", "independent_household")
          .eq("status", "pending");
        const pendingMemberIds = (memberData || [])
          .filter((m) => indepReqs?.some((r) => r.user_id === m.promoted_user_id))
          .map((m) => m.id);
        setIndependencePendingMemberIds(pendingMemberIds);
      } else {
        setIndependencePendingMemberIds([]);
      }

      // If this user was originally a household member of someone else, show the
      // head's name and whether they've requested independence.
      if (userData.head_user_id) {
        const { data: headData } = await supabase.from("users").select("full_name").eq("id", userData.head_user_id).single();
        setHeadName(headData?.full_name || null);

        const { data: indepReq } = await supabase
          .from("update_requests")
          .select("id, status")
          .eq("user_id", userData.id)
          .eq("field", "independent_household")
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();
        setPendingIndependence(!!indepReq);
      } else {
        setHeadName(null);
        setPendingIndependence(false);
      }

      const { data: reqData } = await supabase.from("update_requests").select("id, field, new_value, status, created_at").eq("user_id", userData.id).order("created_at", { ascending: false }).limit(10);
      if (reqData) setRequests(reqData);

      const { data: allRefs } = await supabase.from("referrals").select("referrer_id");
      if (allRefs && allRefs.length > 0) {
        const counts: Record<string, number> = {};
        allRefs.forEach((r) => { counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const ids = sorted.map(([id]) => id);
        if (ids.length > 0) {
          const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
          const nameMap: Record<string, string> = {};
          names?.forEach((n) => { nameMap[n.id] = n.full_name; });
          setLeaderboard(sorted.map(([id, count]) => ({
            referral_count: count,
            full_name: nameMap[id] || "Anonymous",
          })));
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    loginWithPhone(phoneInput);
  };

  const handleLogout = () => {
    localStorage.removeItem("en-route-phone");
    setUser(null);
    setHeadName(null);
    setPendingIndependence(false);
    setShowLoginForm(true);
    setPhoneInput("");
  };

  const handleRequestIndependence = async () => {
    if (!user) return;
    setRequestingIndependence(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("update_requests").insert({
        user_id: user.id,
        field: "independent_household",
        new_value: "I would like to manage my own independent household.",
      });
      if (error) throw error;
      setPendingIndependence(true);
      toast.success("Independence request submitted");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setRequestingIndependence(false);
    }
  };

  const copyReferralLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.referral_code}`);
    toast.success("Referral link copied!");
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const maskPhone = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length <= 4) return phone;
    return cleaned.slice(0, 2) + "xxxx" + cleaned.slice(-2);
  };

  const maskName = (name: string) => {
    const parts = name.split(" ");
    return parts.map((part) => {
      if (part.length <= 2) return part;
      return part[0] + part[1] + "*".repeat(part.length - 2);
    }).join(" ");
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending_verification: { label: "Pending Verification", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
    verified: { label: "Verified", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    needs_clarification: { label: "Needs Info", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  };

  const handleSavePhotos = async () => {
    if (!user) return;
    setSavingPhotos(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("users").update({ photos: editPhotos }).eq("id", user.id);
      if (error) throw error;
      setUser((u) => u ? { ...u, photos: editPhotos } : null);
      toast.success("Photos updated");
    } catch {
      toast.error("Failed to save photos");
    } finally {
      setSavingPhotos(false);
    }
  };

  const handleRequestPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Image must be under 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRequestPhoto(reader.result as string);
      setUpdateValue(`I want to upload a new photo: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  
  const handleRequestMorePhotos = () => {
    setUpdateField("photos");
    setUpdateValue("I would like to add more house photos beyond the 4-photo limit.");
    document.getElementById("update-request-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !updateField || !updateValue.trim()) return;
    setSubmittingUpdate(true);
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        user_id: user.id,
        field: updateField,
        new_value: updateValue.trim(),
      };
      if (updateField === "photos" && requestPhoto) {
        payload.image_data = requestPhoto;
      }
      const { error } = await supabase.from("update_requests").insert(payload);
      if (error) throw error;
      toast.success("Update request submitted");
      setUpdateField("");
      setUpdateValue("");
      setRequestPhoto(null);
      const { data: reqData } = await supabase.from("update_requests").select("id, field, new_value, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (reqData) setRequests(reqData);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Login Form
  if (showLoginForm) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-5">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="text-white" size={28} />
              </div>
              <h1 className="text-xl font-bold mb-1">Your Dashboard</h1>
              <p className="text-sm text-[var(--text-secondary)]">Enter your phone number to access your account</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                <LogIn size={16} className="mr-2" /> Access Dashboard
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <Link href="/check" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
                Check registration status
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!user) return null;

  const breakdown = getPointsBreakdown({
    fullName: user.full_name,
    phone: user.phone,
    mapsLink: user.maps_link,
    photos: user.photos || [],
    locationDesc: user.location_desc || "",
    hasFamilyMember: members.length > 0,
  });

  const houseTypeLabel = user.house_type === "owned" ? "Owned" : user.house_type === "rent" ? "Rented" : null;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
              <ArrowLeft size={18} />
            </Link>
            <button onClick={handleLogout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)]">
              Logout
            </button>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="bg-gradient-to-r from-[var(--primary)] to-emerald-500 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold">{maskName(user.full_name)}</p>
              <p className="text-sm text-white/80">{maskPhone(user.phone)}</p>
            </div>
            {statusConfig[user.verification_status] && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusConfig[user.verification_status].bg} ${statusConfig[user.verification_status].color}`}>
                {statusConfig[user.verification_status].label}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalHouseholds.toLocaleString()}</p>
              <p className="text-sm text-white/80">Households</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold">{user.points}</p>
              <p className="text-sm text-white/80">Your Points</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold">{referralCount}</p>
              <p className="text-sm text-white/80">Referrals</p>
            </div>
          </div>
        </div>

        {/* Clarification Banner */}
        {user.verification_status === "needs_clarification" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-800 mb-1">Action Needed</p>
                <p className="text-sm text-orange-700">{user.clarification_note || "Your registration needs more information. Please contact admin via WhatsApp for details."}</p>
              </div>
            </div>
          </div>
        )}

        {/* Household membership banner */}
        {user.head_user_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 mb-1">Part of a household</p>
                <p className="text-sm text-blue-700">
                  You're registered under {headName ? maskName(headName) : "another"}'s household.
                </p>
                {pendingIndependence ? (
                  <p className="text-xs text-blue-600 mt-2 font-medium">Request to manage your own household is pending review.</p>
                ) : (
                  <button
                    onClick={handleRequestIndependence}
                    disabled={requestingIndependence}
                    className="mt-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition"
                  >
                    {requestingIndependence ? "Submitting..." : "Request Independent Household"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <Card className="mb-6">
          <CardContent>
            <ProgressBar current={user.points} max={30} />
          </CardContent>
        </Card>

        {/* Referral */}
        <Card className="mb-6 border-[var(--primary)]/20">
          <CardHeader className="bg-[var(--primary)]/5">
            <h2 className="font-semibold text-sm text-[var(--primary)]">Your Referral Link</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">Share with friends. Earn +10 points for each registration.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 px-3 py-2.5 rounded-lg truncate border border-[var(--border)] font-mono">
                {typeof window !== "undefined" ? `${window.location.origin}/register?ref=${user.referral_code}` : `/register?ref=${user.referral_code}`}
              </code>
              <Button size="sm" onClick={copyReferralLink}><Copy size={14} /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Points Breakdown */}
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold text-sm">Points Breakdown</h2></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className={item.earned ? "text-[var(--text)]" : "text-[var(--text-secondary)]"}>
                    {item.earned ? "✓" : "○"} {item.label}
                  </span>
                  <span className={item.earned ? "font-medium text-[var(--primary)]" : "text-[var(--text-secondary)]"}>+{item.points}</span>
                </div>
              ))}
              {houseTypeLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text)]">✓ House: {houseTypeLabel}</span>
                  <span className="text-xs text-[var(--text-secondary)]">info</span>
                </div>
              )}
              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-sm font-semibold">
                <span>Profile Total</span>
                <span className="text-[var(--primary)]">{user.points}/30</span>
              </div>
              {referralCount > 0 && (
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Referral Bonus</span>
                  <span className="text-[var(--primary)]">+{referralCount * 10}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Household Members */}
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold text-sm">Household Members ({members.length})</h2></CardHeader>
          <CardContent className="space-y-3">
            {/* Registered person */}
            <div className="flex items-center justify-between bg-[var(--primary)]/5 rounded-xl px-4 py-2.5 border border-[var(--primary)]/20">
              <div>
                <p className="text-sm font-medium">{maskName(user.full_name)}</p>
                <p className="text-xs text-[var(--text-secondary)]">{maskPhone(user.phone)} (You)</p>
              </div>
              <span className="text-xs text-[var(--primary)] font-medium">Registered</span>
            </div>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{maskName(member.name)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{maskPhone(member.phone)}</p>
                    </div>
                    {member.promoted_user_id && (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 font-medium px-2 py-1 rounded-full shrink-0">
                        {independencePendingMemberIds.includes(member.id) ? "Independence requested" : "Registered ✓"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No members added yet.</p>
            )}
            <button
              onClick={() => { setUpdateField("add_member"); document.getElementById("update-request-section")?.scrollIntoView({ behavior: "smooth" }); }}
              className="w-full flex items-center justify-center gap-2 text-xs text-[var(--primary)] bg-[var(--primary)]/5 rounded-xl py-2.5 hover:bg-[var(--primary)]/10 transition"
            >
              <Send size={12} /> Request to add or remove members
            </button>
          </CardContent>
        </Card>

        {/* Photos - Hidden, request only */}
        {editPhotos.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="font-semibold text-sm">House Photos ({editPhotos.length}/4)</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm text-[var(--text-secondary)]">{editPhotos.length} photo(s) on file</p>
                <span className="text-xs text-[var(--text-secondary)]">Locked</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Update Request */}
        <Card id="update-request-section" className="mb-6">
          <CardHeader><h2 className="font-semibold text-sm">Request an Update</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitUpdate} className="space-y-3">
              <select
                value={updateField}
                onChange={(e) => setUpdateField(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm"
              >
                <option value="">Select field to update...</option>
                {updateFields.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
              {updateField && (
                <>
                  {updateField === "photos" ? (
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleRequestPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition"
                      >
                        <Camera size={20} />
                        <span className="text-sm">{requestPhoto ? "Change photo" : "Tap to upload photo"}</span>
                      </button>
                      {requestPhoto && (
                        <div className="relative">
                          <img src={requestPhoto} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => { setRequestPhoto(null); setUpdateValue(""); }}
                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white text-xs"
                          >✕</button>
                        </div>
                      )}
                      <p className="text-xs text-[var(--text-secondary)]">Max 1MB. Admin will review and upload.</p>
                    </div>
                  ) : updateField === "delete_photos" ? (
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--text-secondary)]">Current photos: {editPhotos.length}</p>
                      <Textarea placeholder="Reason for deleting photos..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={2} />
                    </div>
                  ) : updateField === "manual" ? (
                    <Textarea placeholder="Write your request here..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={4} />
                  ) : (
                    <Textarea placeholder="Enter the new value..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={2} />
                  )}
                  <Button type="submit" size="sm" loading={submittingUpdate} disabled={!updateValue.trim()}>
                    <Send size={14} className="mr-1" /> Submit Request
                  </Button>
                </>
              )}
            </form>
            {requests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">Recent Requests</p>
                <div className="space-y-1.5">
                  {requests.slice(0, 5).map((req) => {
                    const Icon = statusIcon[req.status] || Clock;
                    return (
                      <div key={req.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{updateFields.find((f) => f.key === req.field)?.label || req.field}</span>
                        <span className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-full ${statusColor[req.status] || ""}`}>
                          <Icon size={10} /> {req.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> Top Referrers
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">{getInitials(entry.full_name)}</span>
                      <span>{getInitials(entry.full_name)}</span>
                    </div>
                    <span className="font-medium">{entry.referral_count} referrals</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ad Banners */}
        <div className="pt-2">
          <AdBanner position="dashboard" />
        </div>
      </div>
    </main>
  );
}


