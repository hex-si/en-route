"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle, CheckCircle, Clock, AlertCircle, RefreshCw, Eye, EyeOff, Pencil, Trash2, Send, X, Save, Users, MapPin, Camera, FileText, UserCheck, Activity, StickyNote } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface UserData {
  id: string;
  full_name: string;
  phone: string;
  maps_link: string;
  location: string | null;
  location_desc: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  points: number;
  verification_status: string;
  clarification_note: string | null;
  referral_code: string;
  house_type: string | null;
  created_at: string;
  household_registration_id: string | null;
  zone_id: string | null;
  area_id: string | null;
  head_user_id: string | null;
  mapping_project_id: string | null;
}

interface HouseholdMember {
  id: string;
  name: string;
  phone: string;
  promoted_user_id: string | null;
}

interface Referral {
  id: string;
  referred_user_id: string;
  referred_name: string;
  referred_phone: string;
  created_at: string;
}

interface UserRequest {
  id: string;
  field: string;
  new_value: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("91") && digits.length >= 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10 && !digits.startsWith("91")) return `91${digits.slice(-10)}`;
  return `91${digits}`;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  pending_verification: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  under_review: { label: "Under Review", icon: Eye, color: "text-blue-600 bg-blue-50" },
  needs_clarification: { label: "Needs Info", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
  verified: { label: "Verified", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  approved: { label: "Approved", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  rejected: { label: "Rejected", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

const tabs = [
  { id: "overview", label: "Overview", icon: UserCheck },
  { id: "location", label: "Location", icon: MapPin },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "members", label: "Members", icon: Users },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "referrals", label: "Referrals", icon: ExternalLink },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "notes", label: "Notes", icon: StickyNote },
];

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPhotos, setShowPhotos] = useState(false);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationNote, setClarificationNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [zoneInput, setZoneInput] = useState("");
  const [savingZone, setSavingZone] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMapsLink, setEditMapsLink] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLocationDesc, setEditLocationDesc] = useState("");
  const [editHouseType, setEditHouseType] = useState("");
  const [editZoneId, setEditZoneId] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editRegId, setEditRegId] = useState("");
  const [editNewZoneName, setEditNewZoneName] = useState("");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [editAreas, setEditAreas] = useState<{ id: string; name: string; code: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState<{ id: string; action: string; details: string; created_at: string }[]>([]);
  const [internalNotes, setInternalNotes] = useState<{ id: string; note: string; created_at: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      if (data.zone_id) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: zone } = await supabase.from("zones").select("name").eq("id", data.zone_id).single();
        setZoneName(zone?.name || null);
      }
      if (data.area_id) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: area } = await supabase.from("areas").select("name").eq("id", data.area_id).single();
        setAreaName(area?.name || null);
      } else { setAreaName(null); }
    }
    const memberRes = await fetch(`/api/users/${id}/members`);
    if (memberRes.ok) { const memberData = await memberRes.json(); setMembers(memberData.members || []); }
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: reqData } = await supabase.from("update_requests").select("id, field, new_value, status, created_at, resolved_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20);
      setUserRequests(reqData || []);

      const { data: refs } = await supabase.from("referrals").select("id, referred_user_id, created_at").eq("referrer_id", id);
      if (refs && refs.length > 0) {
        const userIds = refs.map(r => r.referred_user_id);
        const { data: referredUsers } = await supabase.from("users").select("id, full_name, phone").in("id", userIds);
        const userMap: Record<string, { full_name: string; phone: string }> = {};
        referredUsers?.forEach(u => { userMap[u.id] = u; });
        setReferrals(refs.map(r => ({
          id: r.id, referred_user_id: r.referred_user_id,
          referred_name: userMap[r.referred_user_id]?.full_name || "Unknown",
          referred_phone: userMap[r.referred_user_id]?.phone || "",
          created_at: r.created_at,
        })));
      } else { setReferrals([]); }

      // Build activity log from existing data
      const activities: { id: string; action: string; details: string; created_at: string }[] = [];
      activities.push({ id: "reg", action: "Registered", details: "Account created", created_at: user?.created_at || "" });
      (reqData || []).forEach((r) => {
        activities.push({
          id: r.id,
          action: `Request: ${r.field.replace(/_/g, " ")}`,
          details: `${r.status}${r.resolved_at ? ` on ${new Date(r.resolved_at).toLocaleDateString()}` : ""}`,
          created_at: r.created_at,
        });
      });
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivityLog(activities);

      // Internal notes (stored in localStorage per user)
      const storedNotes = localStorage.getItem(`en-route-notes-${id}`);
      if (storedNotes) setInternalNotes(JSON.parse(storedNotes));
    } catch { setReferrals([]); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const interval = setInterval(() => { fetchData(); }, 10000); return () => clearInterval(interval); }, [fetchData]);

  useEffect(() => {
    const fetchZones = async () => {
      try { const { createClient } = await import("@/lib/supabase/client"); const supabase = createClient(); const { data } = await supabase.from("zones").select("id, name").order("name"); if (data) setZones(data); } catch {}
    };
    fetchZones();
  }, []);

  const updateStatus = async (status: string, note?: string) => {
    setUpdating(true);
    try {
      const body: Record<string, string> = { verification_status: status };
      if (status === "needs_clarification" && note) body.clarification_note = note;
      const res = await fetch(`/api/users/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setUser((u) => u ? { ...u, verification_status: status, clarification_note: note || null } : null);
        toast.success("Status updated");
        if (data.whatsappUrl) { window.open(data.whatsappUrl, "_blank"); toast.success("WhatsApp notification opened"); }
      } else { toast.error("Failed to update"); }
    } catch { toast.error("Failed to update"); } finally {
      setUpdating(false); setShowClarificationModal(false); setClarificationNote(""); setPendingStatus("");
    }
  };

  const handleStatusClick = (status: string) => {
    if (status === "needs_clarification") { setPendingStatus(status); setShowClarificationModal(true); }
    else updateStatus(status);
  };

  const handleSaveZone = async () => {
    if (!zoneInput.trim()) return;
    setSavingZone(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const zoneNameVal = zoneInput.trim();
      let { data: zone } = await supabase.from("zones").select("id").eq("name", zoneNameVal).single();
      if (!zone) {
        const prefix = zoneNameVal.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
        const { data: newZone } = await supabase.from("zones").insert({ name: zoneNameVal, prefix }).select("id").single();
        zone = newZone;
      }
      if (!zone) { toast.error("Failed to create zone"); setSavingZone(false); return; }
      const { data: regId, error: regIdError } = await supabase.rpc("generate_household_registration_id", { zone_uuid: zone.id, area_uuid: null });
      if (regIdError) { toast.error("Failed to generate ID"); setSavingZone(false); return; }
      const res = await fetch(`/api/users/${id}/update`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone_id: zone.id, household_registration_id: regId }) });
      if (!res.ok) { toast.error("Failed to save"); setSavingZone(false); return; }
      setUser((u) => u ? { ...u, zone_id: zone.id, household_registration_id: regId } : null);
      setZoneName(zoneNameVal); setZoneInput(""); toast.success("Zone and Household ID assigned!");
    } catch { toast.error("Something went wrong"); } finally { setSavingZone(false); }
  };

  const startEditing = async () => {
    if (!user) return;
    setEditName(user.full_name); setEditPhone(user.phone); setEditMapsLink(user.maps_link || "");
    setEditLocation(user.location || ""); setEditLocationDesc(user.location_desc || ""); setEditHouseType(user.house_type || "");
    setEditZoneId(user.zone_id || ""); setEditAreaId(user.area_id || "");
    setEditRegId(user.household_registration_id || ""); setEditNewZoneName(""); setEditing(true);
    if (user.zone_id) {
      try { const { createClient } = await import("@/lib/supabase/client"); const supabase = createClient(); const { data } = await supabase.from("areas").select("id, name, code").eq("zone_id", user.zone_id).order("name"); if (data) setEditAreas(data); } catch { setEditAreas([]); }
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      let finalZoneId = editZoneId; let finalAreaId = editAreaId;
      if (editNewZoneName.trim()) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const zoneNameVal = editNewZoneName.trim();
        let { data: zone } = await supabase.from("zones").select("id").eq("name", zoneNameVal).single();
        if (!zone) {
          const prefix = zoneNameVal.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
          const { data: newZone } = await supabase.from("zones").insert({ name: zoneNameVal, prefix }).select("id").single();
          zone = newZone;
          if (zone) setZones((prev) => [...prev, { id: zone!.id, name: zoneNameVal }].sort((a, b) => a.name.localeCompare(b.name)));
        }
        if (zone) finalZoneId = zone.id;
      }
      let finalRegId = editRegId;
      if (finalZoneId && !finalRegId) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: regId } = await supabase.rpc("generate_household_registration_id", { zone_uuid: finalZoneId, area_uuid: finalAreaId || null });
        if (regId) finalRegId = regId;
      }
      const res = await fetch(`/api/users/${id}/update`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, phone: editPhone, maps_link: editMapsLink, location: editLocation, location_desc: editLocationDesc, house_type: editHouseType || null, zone_id: finalZoneId || null, area_id: finalAreaId || null, household_registration_id: finalRegId || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setUser((u) => u ? { ...u, full_name: editName, phone: editPhone, maps_link: editMapsLink, location: editLocation, location_desc: editLocationDesc, house_type: editHouseType || null, zone_id: finalZoneId || null, area_id: finalAreaId || null, household_registration_id: finalRegId || null } : null);
      if (finalZoneId) { const matchedZone = zones.find((z) => z.id === finalZoneId) || (editNewZoneName.trim() ? { name: editNewZoneName.trim() } : null); if (matchedZone) setZoneName(matchedZone.name); }
      if (finalAreaId) { const matchedArea = editAreas.find((a) => a.id === finalAreaId); if (matchedArea) setAreaName(matchedArea.name); } else { setAreaName(null); }
      setEditing(false); toast.success("User updated");
    } catch { toast.error("Failed to update user"); } finally { setSavingEdit(false); }
  };

  const handleSendFillUpForm = () => {
    if (!user) return;
    const phone = toWhatsAppPhone(user.phone);
    const siteUrl = "https://discoverukhrul.site";
    const message = encodeURIComponent(
      `Hi ${user.full_name},\n\nThis is the En-Route team (Hashtag Dropee). Your household address registration is incomplete.\n\nPlease update your profile to ensure accurate delivery mapping:\n\n${siteUrl}/dashboard\n\nWhat to check:\n• Your name and phone number\n• Google Maps pin location\n• Location description\n• House photos (front view)\n• Zone assignment\n\nYour registration ID: ${user.household_registration_id || "Not assigned yet"}\n\nThank you!\n— Hashtag Dropee Team`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    toast.success("WhatsApp opened with fill-up form message");
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try { const res = await fetch(`/api/users/${id}/delete`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed"); toast.success("User deleted"); router.push("/admin/users"); } catch { toast.error("Failed to delete user"); setDeleting(false); }
  };

  const handleDeleteMember = async (memberId: string) => {
    try { const res = await fetch(`/api/users/${id}/members/${memberId}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed"); setMembers((m) => m.filter((mem) => mem.id !== memberId)); toast.success("Member removed"); } catch { toast.error("Failed to remove member"); }
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>;
  if (!user) return <div className="text-center py-12 text-[var(--text-secondary)]">User not found</div>;

  const status = statusConfig[user.verification_status] || statusConfig.pending_verification;
  const StatusIcon = status.icon;

  return (
    <div>
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">{user.full_name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{user.phone}</p>
          {user.household_registration_id && (
            <p className="text-sm font-mono font-medium text-[var(--primary)] mt-1">ID: {user.household_registration_id}</p>
          )}
          {zoneName && <p className="text-xs text-[var(--text-secondary)] mt-0.5">Zone: {zoneName}{areaName ? ` > ${areaName}` : ""}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
            <StatusIcon size={14} /> {status.label}
          </span>
          <Button size="sm" onClick={startEditing}><Pencil size={14} className="mr-1" /> Edit</Button>
          <Button size="sm" variant="secondary" onClick={handleSendFillUpForm}><Send size={14} className="mr-1" /> Fill-Up</Button>
          <a href={`https://wa.me/${toWhatsAppPhone(user.phone)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition">
            <MessageCircle size={14} /> WhatsApp
          </a>
          <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab.id ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-gray-100"}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><h2 className="font-semibold text-sm">Details</h2></CardHeader>
            <CardContent className="space-y-4">
              {user.household_registration_id && (
                <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Registration ID</span><code className="text-sm font-mono font-medium text-[var(--primary)]">{user.household_registration_id}</code></div>
              )}
              {user.location && (
                <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Location</span><span className="text-sm font-medium">{user.location}</span></div>
              )}
              {zoneName && (
                <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Zone</span><span className="text-sm font-medium">{zoneName}{areaName ? ` > ${areaName}` : ""}</span></div>
              )}
              {!user.household_registration_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-blue-800 mb-2">No Zone or Household ID</p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Zone name" value={zoneInput} onChange={(e) => setZoneInput(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                    <Button size="sm" onClick={handleSaveZone} loading={savingZone} disabled={!zoneInput.trim()}>Assign</Button>
                  </div>
                </div>
              )}
              {user.household_registration_id && zoneName && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-green-800">Household ID Assigned</p>
                  <p className="text-sm font-mono font-medium text-green-700 mt-1">{user.household_registration_id}</p>
                  <p className="text-xs text-green-600 mt-0.5">Zone: {zoneName}{areaName ? ` > ${areaName}` : ""}</p>
                </div>
              )}
              <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Points</span><span className="font-bold text-lg text-[var(--primary)]">{user.points}/30</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Referral Code</span><code className="text-sm font-mono">{user.referral_code}</code></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">Registered</span><span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span></div>
              {user.house_type && (<div className="flex items-center justify-between"><span className="text-sm text-[var(--text-secondary)]">House Type</span><span className="text-sm font-medium capitalize">{user.house_type}</span></div>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-sm">Verification</h2></CardHeader>
            <CardContent className="space-y-4">
              {user.clarification_note && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">Clarification needed:</p>
                  <p className="text-sm text-orange-700">{user.clarification_note}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(["pending", "under_review", "needs_clarification", "verified", "rejected"] as const).map((s) => (
                  <Button key={s} size="sm" variant={user.verification_status === s ? "primary" : "secondary"} onClick={() => handleStatusClick(s)} loading={updating}>
                    {statusConfig[s]?.label || s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "location" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><h2 className="font-semibold text-sm">Location Details</h2></CardHeader>
            <CardContent className="space-y-4">
              {user.location && (
                <div><p className="text-xs text-[var(--text-secondary)] mb-1">Location</p><p className="text-sm font-medium">{user.location}</p></div>
              )}
              {user.location_desc && (
                <div><p className="text-xs text-[var(--text-secondary)] mb-1">Description</p><p className="text-sm">{user.location_desc}</p></div>
              )}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Google Maps Link</p>
                {user.maps_link ? (
                  <a href={user.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
                    Open in Maps <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Not set</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="font-semibold text-sm">Coordinates</h2></CardHeader>
            <CardContent className="space-y-4">
              {(user.latitude || user.longitude) ? (
                <>
                  <div><p className="text-xs text-[var(--text-secondary)] mb-1">Latitude</p><p className="text-sm font-mono">{user.latitude}</p></div>
                  <div><p className="text-xs text-[var(--text-secondary)] mb-1">Longitude</p><p className="text-sm font-mono">{user.longitude}</p></div>
                  <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${user.longitude! - 0.01},${user.latitude! - 0.01},${user.longitude! + 0.01},${user.latitude! + 0.01}&layer=mapnik&marker=${user.latitude},${user.longitude}`}
                      className="border-0"
                      title="User Location"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <MapPin size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No coordinates set</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "photos" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Photos ({user.photos?.length || 0})</h2>
              {user.photos && user.photos.length > 0 && (
                <button onClick={() => setShowPhotos(!showPhotos)} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]">
                  {showPhotos ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!showPhotos ? (
              <p className="text-sm text-[var(--text-secondary)]">{user.photos?.length || 0} photo(s) hidden for privacy</p>
            ) : user.photos && user.photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {user.photos.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                    <img src={photo} alt={`Photo ${i + 1}`} loading="lazy" decoding="async" className="w-full aspect-square object-cover rounded-xl border border-[var(--border)]" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No photos uploaded</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "members" && (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Household Members ({members.length})</h2></CardHeader>
          <CardContent className="space-y-3">
            {members.length > 0 ? (
              <div className="space-y-1.5">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{member.name}</span>
                      {member.promoted_user_id && (<span className="text-[10px] text-green-700 bg-green-50 border border-green-200 font-medium px-1.5 py-0.5 rounded-full">Registered</span>)}
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`https://wa.me/${toWhatsAppPhone(member.phone)}`} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] text-xs hover:underline">{member.phone}</a>
                      {!member.promoted_user_id && (<button onClick={() => handleDeleteMember(member.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={12} /></button>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-[var(--text-secondary)]">No household members</p>)}
          </CardContent>
        </Card>
      )}

      {activeTab === "requests" && (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Update Requests ({userRequests.length})</h2></CardHeader>
          <CardContent>
            {userRequests.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {userRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-4 py-2.5">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium">{req.field.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{req.new_value}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${req.status === "approved" ? "text-green-600 bg-green-50" : req.status === "rejected" ? "text-red-600 bg-red-50" : "text-yellow-600 bg-yellow-50"}`}>
                        {req.status === "approved" ? <CheckCircle size={10} /> : req.status === "rejected" ? <X size={10} /> : <Clock size={10} />} {req.status}
                      </span>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-[var(--text-secondary)]">No requests yet</p>)}
          </CardContent>
        </Card>
      )}

      {activeTab === "referrals" && (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Referrals ({referrals.length})</h2></CardHeader>
          <CardContent>
            {referrals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{ref.referred_name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{ref.referred_phone ? `${ref.referred_phone.slice(0, 2)}xxxx${ref.referred_phone.slice(-2)}` : "No phone"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)]">{new Date(ref.created_at).toLocaleDateString()}</p>
                      <a href={`/admin/users/${ref.referred_user_id}`} className="text-xs text-[var(--primary)] hover:underline">View</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-[var(--text-secondary)]">No referrals yet</p>)}
          </CardContent>
        </Card>
      )}

      {activeTab === "activity" && (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm flex items-center gap-2"><Activity size={14} /> Activity Log</h2></CardHeader>
          <CardContent>
            {activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{act.action}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{act.details}</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] shrink-0">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">No activity recorded</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "notes" && (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm flex items-center gap-2"><StickyNote size={14} /> Internal Notes</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNote.trim()) {
                    const note = { id: Date.now().toString(), note: newNote.trim(), created_at: new Date().toISOString() };
                    const updated = [...internalNotes, note];
                    setInternalNotes(updated);
                    localStorage.setItem(`en-route-notes-${id}`, JSON.stringify(updated));
                    setNewNote("");
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <Button size="sm" onClick={() => {
                if (newNote.trim()) {
                  const note = { id: Date.now().toString(), note: newNote.trim(), created_at: new Date().toISOString() };
                  const updated = [...internalNotes, note];
                  setInternalNotes(updated);
                  localStorage.setItem(`en-route-notes-${id}`, JSON.stringify(updated));
                  setNewNote("");
                }
              }} disabled={!newNote.trim()}>Add</Button>
            </div>
            {internalNotes.length > 0 ? (
              <div className="space-y-2">
                {internalNotes.map((n) => (
                  <div key={n.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <p className="text-sm">{n.note}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-[var(--text-secondary)]">{new Date(n.created_at).toLocaleString()}</p>
                      <button onClick={() => {
                        const updated = internalNotes.filter((note) => note.id !== n.id);
                        setInternalNotes(updated);
                        localStorage.setItem(`en-route-notes-${id}`, JSON.stringify(updated));
                      }} className="text-[10px] text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">No internal notes yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setEditing(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-lg lg:max-w-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Edit User</h3>
              <button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Full Name</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Phone</label><input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Google Maps Link</label><input type="text" value={editMapsLink} onChange={(e) => setEditMapsLink(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Location</label><input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Phungreitang East" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
              <div className="lg:col-span-2"><label className="text-xs text-[var(--text-secondary)] mb-1 block">Location Description</label><textarea value={editLocationDesc} onChange={(e) => setEditLocationDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">House Type</label><select value={editHouseType} onChange={(e) => setEditHouseType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 bg-white"><option value="">Not set</option><option value="owned">Owned</option><option value="rent">Rented</option></select></div>
              <div className="lg:col-span-2 border-t border-[var(--border)] pt-3 mt-3"><p className="text-xs font-medium text-[var(--text)] mb-2">Zone & Registration</p></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Zone</label><select value={editZoneId} onChange={async (e) => { setEditZoneId(e.target.value); setEditNewZoneName(""); setEditAreaId(""); if (e.target.value) { try { const { createClient } = await import("@/lib/supabase/client"); const supabase = createClient(); const { data } = await supabase.from("areas").select("id, name, code").eq("zone_id", e.target.value).order("name"); if (data) setEditAreas(data); else setEditAreas([]); } catch { setEditAreas([]); } } else { setEditAreas([]); } }} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 bg-white"><option value="">No zone</option>{zones.map((z) => (<option key={z.id} value={z.id}>{z.name}</option>))}</select></div>
              {editAreas.length > 0 && (<div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Area</label><select value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 bg-white"><option value="">No subdivision</option>{editAreas.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}</select></div>)}
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Or Create New Zone</label><input type="text" value={editNewZoneName} onChange={(e) => { setEditNewZoneName(e.target.value); setEditZoneId(""); }} placeholder="e.g. Phungreitang – East" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
              <div><label className="text-xs text-[var(--text-secondary)] mb-1 block">Household Registration ID</label><input type="text" value={editRegId} onChange={(e) => setEditRegId(e.target.value)} placeholder="Auto-generated if zone is set" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 font-mono" /><p className="text-[10px] text-[var(--text-secondary)] mt-1">Leave blank to auto-generate from zone</p></div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} loading={savingEdit} className="flex-1"><Save size={14} className="mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {showClarificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setShowClarificationModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">What needs clarification?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">This message will be shown to the user on their dashboard and sent via WhatsApp.</p>
            <textarea value={clarificationNote} onChange={(e) => setClarificationNote(e.target.value)} placeholder="e.g. Please upload a clearer photo of your house front..." rows={3} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm resize-none mb-4" />
            <div className="flex gap-3">
              <Button size="sm" variant="secondary" onClick={() => { setShowClarificationModal(false); setClarificationNote(""); setPendingStatus(""); }} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={() => updateStatus(pendingStatus, clarificationNote)} loading={updating} disabled={!clarificationNote.trim()} className="flex-1">Send & Open WhatsApp</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1 text-red-700">Delete User?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">This will permanently delete <strong>{user.full_name}</strong> and all their data including members, requests, and referrals. This cannot be undone.</p>
            <div className="flex gap-3">
              <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleDeleteUser} loading={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white"><Trash2 size={14} className="mr-1" /> Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
