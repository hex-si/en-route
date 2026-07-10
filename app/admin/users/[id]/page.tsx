"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle, CheckCircle, Clock, AlertCircle, RefreshCw, Eye, EyeOff, Pencil, Trash2, Send, X, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface UserData {
  id: string;
  full_name: string;
  phone: string;
  maps_link: string;
  location_desc: string;
  photos: string[];
  points: number;
  verification_status: string;
  clarification_note: string | null;
  referral_code: string;
  house_type: string | null;
  created_at: string;
  household_registration_id: string | null;
  zone_id: string | null;
  head_user_id: string | null;
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

function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("91") && digits.length >= 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10 && !digits.startsWith("91")) return `91${digits.slice(-10)}`;
  return `91${digits}`;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending_verification: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  verified: { label: "Verified", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  needs_clarification: { label: "Needs Info", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationNote, setClarificationNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [zoneInput, setZoneInput] = useState("");
  const [savingZone, setSavingZone] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMapsLink, setEditMapsLink] = useState("");
  const [editLocationDesc, setEditLocationDesc] = useState("");
  const [editHouseType, setEditHouseType] = useState("");
  const [editZoneId, setEditZoneId] = useState("");
  const [editRegId, setEditRegId] = useState("");
  const [editNewZoneName, setEditNewZoneName] = useState("");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    }
    const memberRes = await fetch(`/api/users/${id}/members`);
    if (memberRes.ok) {
      const memberData = await memberRes.json();
      setMembers(memberData.members || []);
    }
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: refs } = await supabase
        .from("referrals")
        .select("id, referred_user_id, created_at")
        .eq("referrer_id", id);
      if (refs && refs.length > 0) {
        const userIds = refs.map(r => r.referred_user_id);
        const { data: referredUsers } = await supabase
          .from("users")
          .select("id, full_name, phone")
          .in("id", userIds);
        const userMap: Record<string, { full_name: string; phone: string }> = {};
        referredUsers?.forEach(u => { userMap[u.id] = u; });
        setReferrals(refs.map(r => ({
          id: r.id,
          referred_user_id: r.referred_user_id,
          referred_name: userMap[r.referred_user_id]?.full_name || "Unknown",
          referred_phone: userMap[r.referred_user_id]?.phone || "",
          created_at: r.created_at,
        })));
      } else {
        setReferrals([]);
      }
    } catch {
      setReferrals([]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.from("zones").select("id, name").order("name");
        if (data) setZones(data);
      } catch {}
    };
    fetchZones();
  }, []);

  const updateStatus = async (status: string, note?: string) => {
    setUpdating(true);
    try {
      const body: Record<string, string> = { verification_status: status };
      if (status === "needs_clarification" && note) {
        body.clarification_note = note;
      }
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((u) => u ? { ...u, verification_status: status, clarification_note: note || null } : null);
        toast.success("Status updated");
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, "_blank");
          toast.success("WhatsApp notification opened");
        }
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(false);
      setShowClarificationModal(false);
      setClarificationNote("");
      setPendingStatus("");
    }
  };

  const handleStatusClick = (status: string) => {
    if (status === "needs_clarification") {
      setPendingStatus(status);
      setShowClarificationModal(true);
    } else {
      updateStatus(status);
    }
  };

  const handleSaveZone = async () => {
    if (!zoneInput.trim()) return;
    setSavingZone(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const zoneNameVal = zoneInput.trim();

      let { data: zone } = await supabase
        .from("zones")
        .select("id")
        .eq("name", zoneNameVal)
        .single();

      if (!zone) {
        const prefix = zoneNameVal
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3);
        const { data: newZone } = await supabase
          .from("zones")
          .insert({ name: zoneNameVal, prefix })
          .select("id")
          .single();
        zone = newZone;
      }

      if (!zone) {
        toast.error("Failed to create zone");
        setSavingZone(false);
        return;
      }

      const { data: regId, error: regIdError } = await supabase.rpc(
        "generate_household_registration_id",
        { zone_uuid: zone.id }
      );
      if (regIdError) {
        toast.error("Failed to generate ID");
        setSavingZone(false);
        return;
      }

      const res = await fetch(`/api/users/${id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone_id: zone.id, household_registration_id: regId }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
        setSavingZone(false);
        return;
      }

      setUser((u) => u ? { ...u, zone_id: zone.id, household_registration_id: regId } : null);
      setZoneName(zoneNameVal);
      setZoneInput("");
      toast.success("Zone and Household ID assigned!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingZone(false);
    }
  };

  const startEditing = () => {
    if (!user) return;
    setEditName(user.full_name);
    setEditPhone(user.phone);
    setEditMapsLink(user.maps_link || "");
    setEditLocationDesc(user.location_desc || "");
    setEditHouseType(user.house_type || "");
    setEditZoneId(user.zone_id || "");
    setEditRegId(user.household_registration_id || "");
    setEditNewZoneName("");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      let finalZoneId = editZoneId;

      if (editNewZoneName.trim()) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const zoneNameVal = editNewZoneName.trim();

        let { data: zone } = await supabase
          .from("zones")
          .select("id")
          .eq("name", zoneNameVal)
          .single();

        if (!zone) {
          const prefix = zoneNameVal
            .split(/\s+/)
            .map((w: string) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 3);
          const { data: newZone } = await supabase
            .from("zones")
            .insert({ name: zoneNameVal, prefix })
            .select("id")
            .single();
          zone = newZone;
          if (zone) setZones((prev) => [...prev, { id: zone!.id, name: zoneNameVal }].sort((a, b) => a.name.localeCompare(b.name)));
        }
        if (zone) finalZoneId = zone.id;
      }

      let finalRegId = editRegId;
      if (finalZoneId && !finalRegId) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: regId } = await supabase.rpc("generate_household_registration_id", { zone_uuid: finalZoneId });
        if (regId) finalRegId = regId;
      }

      const res = await fetch(`/api/users/${id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editName,
          phone: editPhone,
          maps_link: editMapsLink,
          location_desc: editLocationDesc,
          house_type: editHouseType || null,
          zone_id: finalZoneId || null,
          household_registration_id: finalRegId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setUser((u) => u ? {
        ...u,
        full_name: editName,
        phone: editPhone,
        maps_link: editMapsLink,
        location_desc: editLocationDesc,
        house_type: editHouseType || null,
        zone_id: finalZoneId || null,
        household_registration_id: finalRegId || null,
      } : null);
      if (finalZoneId) {
        const matchedZone = zones.find((z) => z.id === finalZoneId) || (editNewZoneName.trim() ? { name: editNewZoneName.trim() } : null);
        if (matchedZone) setZoneName(matchedZone.name);
      }
      setEditing(false);
      toast.success("User updated");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSendFillUpForm = () => {
    if (!user) return;
    const phone = toWhatsAppPhone(user.phone);
    const siteUrl = "https://discoverukhrul.site";
    const message = encodeURIComponent(
      `Hi ${user.full_name},\n\n` +
      `This is the En-Route team (Hashtag Dropee). Your household address registration is incomplete.\n\n` +
      `Please update your profile to ensure accurate delivery mapping:\n\n` +
      `${siteUrl}/dashboard\n\n` +
      `What to check:\n` +
      `• Your name and phone number\n` +
      `• Google Maps pin location\n` +
      `• Location description\n` +
      `• House photos (front view)\n` +
      `• Zone assignment\n\n` +
      `Your registration ID: ${user.household_registration_id || "Not assigned yet"}\n\n` +
      `Thank you!\n— Hashtag Dropee Team`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    toast.success("WhatsApp opened with fill-up form message");
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("User deleted");
      router.push("/admin/users");
    } catch {
      toast.error("Failed to delete user");
      setDeleting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/users/${id}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setMembers((m) => m.filter((mem) => mem.id !== memberId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>;
  if (!user) return <div className="text-center py-12 text-[var(--text-secondary)]">User not found</div>;

  const status = statusConfig[user.verification_status] || statusConfig.pending_verification;
  const StatusIcon = status.icon;

  return (
    <div>
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{user.full_name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{user.phone}</p>
          {user.household_registration_id && (
            <p className="text-sm font-mono font-medium text-[var(--primary)] mt-1">ID: {user.household_registration_id}</p>
          )}
          {zoneName && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Zone: {zoneName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
            <StatusIcon size={14} /> {status.label}
          </span>
          <Button size="sm" variant="secondary" onClick={() => fetchData()} loading={loading}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" onClick={startEditing}>
          <Pencil size={14} className="mr-1" /> Edit User
        </Button>
        <Button size="sm" variant="secondary" onClick={handleSendFillUpForm}>
          <Send size={14} className="mr-1" /> Send Fill-Up Form
        </Button>
        <a
          href={`https://wa.me/${toWhatsAppPhone(user.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition"
        >
          <MessageCircle size={14} /> WhatsApp
        </a>
        <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 size={14} className="mr-1" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Location</h2></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Google Maps Link</p>
              <a href={user.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
                Open in Maps <ExternalLink size={12} />
              </a>
            </div>
            {user.location_desc && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Description</p>
                <p className="text-sm">{user.location_desc}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Photos ({user.photos?.length || 0})</h2>
              {user.photos && user.photos.length > 0 && (
                <button
                  onClick={() => setShowPhotos(!showPhotos)}
                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]"
                >
                  {showPhotos ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!showPhotos ? (
              <p className="text-sm text-[var(--text-secondary)]">{user.photos?.length || 0} photo(s) hidden for privacy</p>
            ) : user.photos && user.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {user.photos.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-[var(--border)]" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No photos uploaded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Contact & Members ({members.length})</h2></CardHeader>
          <CardContent className="space-y-3">
            {members.length > 0 ? (
              <div className="space-y-1.5">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{member.name}</span>
                      {member.promoted_user_id && (
                        <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 font-medium px-1.5 py-0.5 rounded-full">
                          Registered
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${toWhatsAppPhone(member.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] text-xs hover:underline"
                      >
                        {member.phone}
                      </a>
                      {!member.promoted_user_id && (
                        <button onClick={() => handleDeleteMember(member.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No household members</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Details</h2></CardHeader>
          <CardContent className="space-y-4">
            {user.household_registration_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Registration ID</span>
                <code className="text-sm font-mono font-medium text-[var(--primary)]">{user.household_registration_id}</code>
              </div>
            )}
            {zoneName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Zone</span>
                <span className="text-sm font-medium">{zoneName}</span>
              </div>
            )}
            {!user.household_registration_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-medium text-blue-800 mb-2">No Zone or Household ID</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Zone name (e.g. Phungreitang – East)"
                    value={zoneInput}
                    onChange={(e) => setZoneInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                  <Button size="sm" onClick={handleSaveZone} loading={savingZone} disabled={!zoneInput.trim()}>
                    Assign
                  </Button>
                </div>
              </div>
            )}
            {user.household_registration_id && zoneName && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-medium text-green-800">Household ID Assigned</p>
                <p className="text-sm font-mono font-medium text-green-700 mt-1">{user.household_registration_id}</p>
                <p className="text-xs text-green-600 mt-0.5">Zone: {zoneName}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Points</span>
              <span className="font-bold text-lg text-[var(--primary)]">{user.points}/30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Referral Code</span>
              <code className="text-sm font-mono">{user.referral_code}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Registered</span>
              <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            {user.house_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">House Type</span>
                <span className="text-sm font-medium capitalize">{user.house_type}</span>
              </div>
            )}
            <div className="pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-secondary)] mb-2">Verification Status</p>
              {user.clarification_note && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">Clarification needed:</p>
                  <p className="text-sm text-orange-700">{user.clarification_note}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(["verified", "needs_clarification", "pending_verification"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={user.verification_status === s ? "primary" : "secondary"}
                    onClick={() => handleStatusClick(s)}
                    loading={updating}
                  >
                    {statusConfig[s].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm">Referrals ({referrals.length})</h2>
          </CardHeader>
          <CardContent>
            {referrals.length > 0 ? (
              <div className="space-y-2">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{ref.referred_name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {ref.referred_phone ? `${ref.referred_phone.slice(0, 2)}xxxx${ref.referred_phone.slice(-2)}` : "No phone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)]">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                      <a
                        href={`/admin/users/${ref.referred_user_id}`}
                        className="text-xs text-[var(--primary)] hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No referrals yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setEditing(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Edit User</h3>
              <button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Full Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Phone</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Google Maps Link</label>
                <input type="text" value={editMapsLink} onChange={(e) => setEditMapsLink(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Location Description</label>
                <textarea value={editLocationDesc} onChange={(e) => setEditLocationDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">House Type</label>
                <select value={editHouseType} onChange={(e) => setEditHouseType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 bg-white">
                  <option value="">Not set</option>
                  <option value="owned">Owned</option>
                  <option value="rent">Rented</option>
                </select>
              </div>
              <div className="border-t border-[var(--border)] pt-3 mt-3">
                <p className="text-xs font-medium text-[var(--text)] mb-2">Zone & Registration</p>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Zone</label>
                <select value={editZoneId} onChange={(e) => { setEditZoneId(e.target.value); setEditNewZoneName(""); }} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 bg-white">
                  <option value="">No zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Or Create New Zone</label>
                <input
                  type="text"
                  value={editNewZoneName}
                  onChange={(e) => { setEditNewZoneName(e.target.value); setEditZoneId(""); }}
                  placeholder="e.g. Phungreitang – East"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Household Registration ID</label>
                <input
                  type="text"
                  value={editRegId}
                  onChange={(e) => setEditRegId(e.target.value)}
                  placeholder="Auto-generated if zone is set"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 font-mono"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Leave blank to auto-generate from zone</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} loading={savingEdit} className="flex-1">
                <Save size={14} className="mr-1" /> Save
              </Button>
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
            <textarea
              value={clarificationNote}
              onChange={(e) => setClarificationNote(e.target.value)}
              placeholder="e.g. Please upload a clearer photo of your house front..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setShowClarificationModal(false); setClarificationNote(""); setPendingStatus(""); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => updateStatus(pendingStatus, clarificationNote)}
                loading={updating}
                disabled={!clarificationNote.trim()}
                className="flex-1"
              >
                Send & Open WhatsApp
              </Button>
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
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              This will permanently delete <strong>{user.full_name}</strong> and all their data including members, requests, and referrals. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleDeleteUser} loading={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
