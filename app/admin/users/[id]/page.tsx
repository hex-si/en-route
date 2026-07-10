"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle, CheckCircle, Clock, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
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
}

interface HouseholdMember {
  id: string;
  name: string;
  phone: string;
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
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationNote, setClarificationNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    }
    const memberRes = await fetch(`/api/users/${id}/members`);
    if (memberRes.ok) {
      const memberData = await memberRes.json();
      setMembers(memberData.members || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
          <CardHeader><h2 className="font-semibold text-sm">Contact</h2></CardHeader>
          <CardContent className="space-y-3">
            <a
              href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600 transition"
            >
              <MessageCircle size={16} /> Open WhatsApp
            </a>
            {members.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">Household Members</p>
                <div className="space-y-1.5">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span>{member.name}</span>
                      <a
                        href={`https://wa.me/${member.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] text-xs hover:underline"
                      >
                        {member.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Details</h2></CardHeader>
          <CardContent className="space-y-4">
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
      </div>

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
    </div>
  );
}