"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Trophy, Copy, ArrowLeft, Star, Send, CheckCircle, Clock, XCircle, Phone, LogIn, AlertCircle, Camera, MessageCircle, Home, Check, Circle, ChevronRight, Share2, ExternalLink } from "lucide-react";
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
  location: string | null;
  location_desc: string;
  maps_link: string;
  house_type: string | null;
  head_user_id: string | null;
  household_registration_id: string | null;
  zone_id: string | null;
  area_id: string | null;
  village_id: string | null;
  mapping_project_id: string | null;
  latitude: number | null;
  longitude: number | null;
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
    under_review: Clock,
    needs_clarification: AlertCircle,
    approved: CheckCircle,
    completed: CheckCircle,
    rejected: XCircle,
  };

  const statusColor: Record<string, string> = {
    pending: "text-yellow-600 bg-yellow-50",
    under_review: "text-blue-600 bg-blue-50",
    needs_clarification: "text-orange-600 bg-orange-50",
    approved: "text-green-600 bg-green-50",
    completed: "text-green-600 bg-green-50",
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
  const [zoneInput, setZoneInput] = useState("");
  const [savingZone, setSavingZone] = useState(false);
  const [areaName, setAreaName] = useState<string | null>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem("en-route-phone");
    if (savedPhone) {
      setPhoneInput(savedPhone);
      loginWithPhone(savedPhone);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard_households_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        supabase.from("users").select("*", { count: "exact", head: true }).then(({ count }) => {
          setTotalHouseholds(count || 0);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loginWithPhone = async (query: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const q = query.trim();
      const isPhone = /^\+?\d+$/.test(q);

      let userData = null;
      if (isPhone) {
        const { data } = await supabase.from("users").select("*").eq("phone", q).single();
        userData = data;
      } else {
        const { data } = await supabase.from("users").select("*").ilike("full_name", `%${q}%`).single();
        userData = data;
      }

      if (!userData) {
        let memberData = null;
        if (isPhone) {
          const { data } = await supabase.from("household_members").select("phone").eq("phone", q).single();
          memberData = data;
        } else {
          const { data } = await supabase.from("household_members").select("phone").ilike("name", `%${q}%`).single();
          memberData = data;
        }
        if (memberData) {
          localStorage.setItem("en-route-member-phone", memberData.phone);
          toast.success("Welcome! Redirecting to your dashboard...");
          router.push("/member-dashboard");
          return;
        }
        toast.error("No account found. Try a different name or phone number.");
        setLoading(false);
        return;
      }

      setUser(userData);
      setEditPhotos(userData.photos || []);
      setShowLoginForm(false);
      localStorage.setItem("en-route-phone", q);

      if (userData.area_id) {
        const { data: areaData } = await supabase.from("areas").select("name").eq("id", userData.area_id).single();
        setAreaName(areaData?.name || null);
      } else {
        setAreaName(null);
      }

      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      setTotalHouseholds(count || 0);

      const { count: refs } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", userData.id);
      setReferralCount(refs || 0);

      const { data: memberData2 } = await supabase.from("household_members").select("*").eq("user_id", userData.id).order("created_at");
      if (memberData2) setMembers(memberData2);

      const promotedIds = (memberData2 || []).filter((m) => m.promoted_user_id).map((m) => m.promoted_user_id);
      if (promotedIds.length > 0) {
        const { data: indepReqs } = await supabase
          .from("update_requests")
          .select("user_id")
          .in("user_id", promotedIds)
          .eq("field", "independent_household")
          .eq("status", "pending");
        const pendingMemberIds = (memberData2 || [])
          .filter((m) => indepReqs?.some((r) => r.user_id === m.promoted_user_id))
          .map((m) => m.id);
        setIndependencePendingMemberIds(pendingMemberIds);
      } else {
        setIndependencePendingMemberIds([]);
      }

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

  const handleSaveZone = async () => {
    if (!user || !zoneInput.trim()) return;
    setSavingZone(true);
    try {
      const supabase = createClient();
      const zoneName = zoneInput.trim();
      let { data: zone } = await supabase.from("zones").select("id").eq("name", zoneName).single();
      if (!zone) {
        const prefix = zoneName.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
        const { data: newZone } = await supabase.from("zones").insert({ name: zoneName, prefix }).select("id").single();
        zone = newZone;
      }
      if (!zone) { toast.error("Failed to create zone"); setSavingZone(false); return; }
      const { data: regId, error: regIdError } = await supabase.rpc("generate_household_registration_id", { zone_uuid: zone.id, area_uuid: null });
      if (regIdError) { toast.error("Failed to generate ID"); setSavingZone(false); return; }
      const { error } = await supabase.from("users").update({ zone_id: zone.id, household_registration_id: regId }).eq("id", user.id);
      if (error) { toast.error("Failed to save"); setSavingZone(false); return; }
      setUser((u) => u ? { ...u, zone_id: zone.id, household_registration_id: regId } : null);
      toast.success("Zone and Household ID saved!");
    } catch { toast.error("Something went wrong"); } finally { setSavingZone(false); }
  };

  const handleRequestIndependence = async () => {
    if (!user) return;
    setRequestingIndependence(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("update_requests").insert({
        user_id: user.id, field: "independent_household", new_value: "I would like to manage my own independent household.",
      });
      if (error) throw error;
      setPendingIndependence(true);
      toast.success("Independence request submitted");
    } catch { toast.error("Failed to submit request"); } finally { setRequestingIndependence(false); }
  };

  const copyReferralLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.referral_code}`);
    toast.success("Referral link copied!");
  };

  const shareReferralWhatsApp = () => {
    if (!user) return;
    const url = `${window.location.origin}/register?ref=${user.referral_code}`;
    const message = encodeURIComponent(`Hey! I use En-Route to register my household address in Ukhrul. It's quick and helps with accurate deliveries. Register yours here:\n\n${url}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
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
    pending: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
    pending_verification: { label: "Pending Verification", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
    under_review: { label: "Under Review", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    needs_clarification: { label: "Needs Info", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
    verified: { label: "Verified", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    approved: { label: "Approved", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200" },
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
    } catch { toast.error("Failed to save photos"); } finally { setSavingPhotos(false); }
  };

  const handleRequestPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Image must be under 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setRequestPhoto(reader.result as string); setUpdateValue(`I want to upload a new photo: ${file.name}`); };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !updateField || !updateValue.trim()) return;
    setSubmittingUpdate(true);
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = { user_id: user.id, field: updateField, new_value: updateValue.trim() };
      if (updateField === "photos" && requestPhoto) payload.image_data = requestPhoto;
      const { error } = await supabase.from("update_requests").insert(payload);
      if (error) throw error;
      toast.success("Update request submitted");
      setUpdateField(""); setUpdateValue(""); setRequestPhoto(null);
      const { data: reqData } = await supabase.from("update_requests").select("id, field, new_value, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (reqData) setRequests(reqData);
    } catch { toast.error("Failed to submit"); } finally { setSubmittingUpdate(false); }
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
              <p className="text-sm text-[var(--text-secondary)]">Enter your phone number or name to access your account</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input placeholder="Phone number or full name" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
              <Button type="submit" loading={loading} className="w-full" size="lg"><LogIn size={16} className="mr-2" /> Access Dashboard</Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <Link href="/check" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">Check registration status</Link>
              <p className="text-xs text-[var(--text-secondary)]">Not registered? <Link href="/register" className="text-[var(--primary)] hover:underline">Register now</Link></p>
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
    fullName: user.full_name, phone: user.phone, mapsLink: user.maps_link,
    photos: user.photos || [], locationDesc: user.location_desc || "", location: user.location || "", hasFamilyMember: members.length > 0,
  });

  const houseTypeLabel = user.house_type === "owned" ? "Owned" : user.house_type === "rent" ? "Rented" : null;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </div>
          <button onClick={handleLogout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)]">Logout</button>
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
          {user.household_registration_id ? (
            <div className="bg-white/15 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">Household Registration ID</p>
                <p className="text-lg font-mono font-bold tracking-wider">{user.household_registration_id}</p>
                {areaName && <p className="text-[10px] text-white/50 mt-0.5">Area: {areaName}</p>}
              </div>
              <Home size={20} className="text-white/60" />
            </div>
          ) : (
            <div className="bg-white/15 rounded-xl px-4 py-2.5 mb-4">
              <p className="text-xs text-white/70 mb-2">No Household ID yet</p>
              <p className="text-xs text-white/60">Enter your zone below to get your Household Registration ID.</p>
            </div>
          )}
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

        {/* Zone Update Form */}
        {!user.zone_id && (
          <Card className="mb-6 border-[var(--primary)]/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Home size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text)] mb-1">Set Your Zone</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Enter your zone to get your Household Registration ID.</p>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Phungreitang – East" value={zoneInput} onChange={(e) => setZoneInput(e.target.value)} />
                    <Button size="sm" onClick={handleSaveZone} loading={savingZone} disabled={!zoneInput.trim()}>Save</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <p className="text-sm text-blue-700">You&apos;re registered under {headName ? maskName(headName) : "another"}&apos;s household.</p>
                {pendingIndependence ? (
                  <p className="text-xs text-blue-600 mt-2 font-medium">Request to manage your own household is pending review.</p>
                ) : (
                  <button onClick={handleRequestIndependence} disabled={requestingIndependence} className="mt-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition">
                    {requestingIndependence ? "Submitting..." : "Request Independent Household"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Completion Checklist */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle size={16} className="text-[var(--primary)]" /> Profile Completion
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.earned ? (
                  <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center shrink-0">
                    <Check size={12} className="text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-200 rounded-full shrink-0" />
                )}
                <span className={`text-sm flex-1 ${item.earned ? "text-[var(--text)]" : "text-[var(--text-secondary)]"}`}>{item.label}</span>
                <span className={`text-xs ${item.earned ? "font-medium text-[var(--primary)]" : "text-[var(--text-secondary)]"}`}>+{item.points}</span>
              </div>
            ))}
            {houseTypeLabel && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" />
                </div>
                <span className="text-sm text-[var(--text)] flex-1">House: {houseTypeLabel}</span>
                <span className="text-xs text-[var(--text-secondary)]">info</span>
              </div>
            )}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-semibold">Profile Score</span>
              <span className="text-lg font-bold text-[var(--primary)]">{user.points}/30</span>
            </div>
            {referralCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Referral Bonus</span>
                <span className="text-lg font-bold text-[var(--primary)]">+{referralCount * 10}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Section */}
        <Card className="mb-6 border-[var(--primary)]/20">
          <CardHeader className="bg-[var(--primary)]/5">
            <h2 className="font-semibold text-sm text-[var(--primary)] flex items-center gap-2">
              <Share2 size={16} /> Share & Earn
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">Share with friends. Earn +10 points for each registration.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 px-3 py-2.5 rounded-lg truncate border border-[var(--border)] font-mono">
                {typeof window !== "undefined" ? `${window.location.origin}/register?ref=${user.referral_code}` : `/register?ref=${user.referral_code}`}
              </code>
              <Button size="sm" onClick={copyReferralLink}><Copy size={14} /></Button>
            </div>
            <button onClick={shareReferralWhatsApp} className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white py-3 rounded-xl text-sm font-medium transition active:scale-[0.98]">
              <MessageCircle size={16} /> Share on WhatsApp
            </button>
          </CardContent>
        </Card>

        {/* Household Members */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users size={16} /> Household Members ({members.length})
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between bg-[var(--primary)]/5 rounded-xl px-4 py-2.5 border border-[var(--primary)]/20">
              <div>
                <p className="text-sm font-medium">{maskName(user.full_name)}</p>
                <p className="text-xs text-[var(--text-secondary)]">{maskPhone(user.phone)} (You)</p>
              </div>
              <span className="text-xs text-[var(--primary)] font-medium">Head</span>
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
            <button onClick={() => { setUpdateField("add_member"); document.getElementById("update-request-section")?.scrollIntoView({ behavior: "smooth" }); }} className="w-full flex items-center justify-center gap-2 text-xs text-[var(--primary)] bg-[var(--primary)]/5 rounded-xl py-2.5 hover:bg-[var(--primary)]/10 transition">
              <Send size={12} /> Request to add or remove members
            </button>
          </CardContent>
        </Card>

        {/* Photos */}
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
            <form onSubmit={handleSubmitUpdate} className="space-y-4">
              <select value={updateField} onChange={(e) => setUpdateField(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm">
                <option value="">Select what to update...</option>
                <option value="full_name">👤 Full Name</option>
                <option value="phone">📱 Phone Number</option>
                <option value="location">📍 Location</option>
                <option value="maps_link">🗺️ Google Maps Link</option>
                <option value="location_desc">📍 Location Description</option>
                <option value="photos">📷 Upload New Photo</option>
                <option value="delete_photos">🗑️ Delete Photos</option>
                <option value="add_member">👥 Add Household Member</option>
                <option value="remove_member">👥 Remove Household Member</option>
                <option value="manual">📝 Custom Request</option>
              </select>

              {/* Dedicated UI per request type */}
              {updateField === "phone" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current Number</p>
                    <p className="text-sm font-mono font-medium">{maskPhone(user.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">New Number</p>
                    <Input type="tel" placeholder="Enter new phone number" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  </div>
                </div>
              )}

              {updateField === "full_name" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current Name</p>
                    <p className="text-sm font-medium">{maskName(user.full_name)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">New Name</p>
                    <Input placeholder="Enter new full name" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  </div>
                </div>
              )}

              {updateField === "location" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current Location</p>
                    <p className="text-sm font-medium">{user.location || <span className="text-[var(--text-secondary)]">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">New Location</p>
                    <Input placeholder="e.g. Phungreitang East" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  </div>
                </div>
              )}

              {updateField === "maps_link" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current Location</p>
                    {user.maps_link ? (
                      <a href={user.maps_link} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
                        Open in Maps <ExternalLink size={12} />
                      </a>
                    ) : <p className="text-sm text-[var(--text-secondary)]">Not set</p>}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">New Google Maps Link</p>
                    <Input placeholder="https://maps.app.goo.gl/..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  </div>
                </div>
              )}

              {updateField === "location_desc" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current Description</p>
                    <p className="text-sm">{user.location_desc || <span className="text-[var(--text-secondary)]">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">New Description</p>
                    <Textarea placeholder="Blue gate beside the church..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              {updateField === "photos" && (
                <div className="space-y-3">
                  {editPhotos.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">Current Photos ({editPhotos.length}/4)</p>
                      <div className="flex gap-2">
                        {editPhotos.map((photo, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleRequestPhotoUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition">
                    <Camera size={20} />
                    <span className="text-sm">{requestPhoto ? "Change photo" : "Tap to upload new photo"}</span>
                  </button>
                  {requestPhoto && (
                    <div className="relative">
                      <img src={requestPhoto} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                      <button type="button" onClick={() => { setRequestPhoto(null); setUpdateValue(""); }} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white text-xs">✕</button>
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--text-secondary)]">Max 1MB. Admin will review and upload.</p>
                </div>
              )}

              {updateField === "delete_photos" && (
                <div className="space-y-3">
                  {editPhotos.length > 0 ? (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">Select photos to delete</p>
                      <div className="grid grid-cols-4 gap-2">
                        {editPhotos.map((photo, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-white text-xs">Keep</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No photos to delete</p>
                  )}
                  <Textarea placeholder="Reason for deleting photos..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={2} />
                </div>
              )}

              {updateField === "add_member" && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-[var(--text-secondary)]">Add a new household member</p>
                  <Input placeholder="Member's full name" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  <Input type="tel" placeholder="Member's phone number" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} />
                  <p className="text-[10px] text-[var(--text-secondary)]">Enter the name and phone in the message below. Admin will add them.</p>
                  <Textarea placeholder="Add member: Name - Phone" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={2} />
                </div>
              )}

              {updateField === "remove_member" && (
                <div className="space-y-3">
                  {members.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-[var(--text-secondary)]">Current members — tap to request removal</p>
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium">{maskName(member.name)}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{maskPhone(member.phone)}</p>
                          </div>
                          <button type="button" onClick={() => setUpdateValue(`Remove: ${member.name} (${member.phone})`)} className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition">
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No members to remove</p>
                  )}
                  {updateValue && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700 font-medium">Removal request:</p>
                      <p className="text-sm text-red-600">{updateValue}</p>
                    </div>
                  )}
                </div>
              )}

              {updateField === "manual" && (
                <Textarea placeholder="Write your request here..." value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} rows={4} />
              )}

              {updateField && (
                <Button type="submit" size="sm" loading={submittingUpdate} disabled={!updateValue.trim()}>
                  <Send size={14} className="mr-1" /> Submit Request
                </Button>
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
          <Card className="mb-6">
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
