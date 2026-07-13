"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface Request {
  id: string;
  user_id: string;
  field: string;
  new_value: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  users?: { full_name: string; phone: string; household_registration_id: string | null };
}

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

const fieldLabels: Record<string, string> = {
  full_name: "Full Name", phone: "Phone Number", maps_link: "Google Maps Link",
  location_desc: "Location Description", photos: "Photos", house_type: "House Type",
  clarification_note: "Clarification Note", spouse_name: "Spouse Name", spouse_phone: "Spouse Phone",
  family_name: "Family Member Name", family_phone: "Family Member Phone",
  add_member: "Add Household Member", remove_member: "Remove Household Member",
  manual: "Custom Request", independent_household: "Independent Household Request",
};

const fieldIcons: Record<string, string> = {
  full_name: "👤", phone: "📱", maps_link: "🗺️", location_desc: "📍",
  photos: "📷", house_type: "🏠", add_member: "👥", remove_member: "👥",
  manual: "📝", independent_household: "🏠",
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/admin/requests");
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { const interval = setInterval(() => { fetchRequests(); }, 10000); return () => clearInterval(interval); }, [fetchRequests]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: action }) });
      if (res.ok) { toast.success(`Request ${action}`); fetchRequests(); } else { const data = await res.json(); toast.error(data.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setProcessing(null); }
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Update Requests</h1>
          <p className="text-sm text-[var(--text-secondary)]">Review and manage user update requests</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => fetchRequests()} loading={loading}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "pending", label: "Pending", count: counts.pending, color: "yellow" },
          { key: "approved", label: "Approved", count: counts.approved, color: "green" },
          { key: "rejected", label: "Rejected", count: counts.rejected, color: "red" },
          { key: "all", label: "All", count: requests.length, color: "gray" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${filter === f.key ? "bg-[var(--primary)] text-white shadow-sm" : "bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50"}`}>
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === f.key ? "bg-white/20" : "bg-gray-100"}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading && requests.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No {filter === "all" ? "" : filter} requests</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const Icon = statusIcon[req.status] || Clock;
            return (
              <Card key={req.id} className="hover:shadow-md transition">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                        {fieldIcons[req.field] || "📝"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{req.users?.full_name || "Unknown"}</p>
                          {req.users?.household_registration_id && (
                            <span className="text-[10px] font-mono text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">{req.users.household_registration_id}</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">{req.users?.phone}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[req.status]}`}>
                      <Icon size={12} /> {req.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText size={12} className="text-[var(--text-secondary)]" />
                      <p className="text-xs text-[var(--text-secondary)]">Field: <span className="font-medium text-[var(--text)]">{fieldLabels[req.field] || req.field}</span></p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{req.new_value}</p>
                  </div>

                  {req.admin_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                      <p className="text-xs font-medium text-blue-800 mb-1">Admin Notes:</p>
                      <p className="text-sm text-blue-700">{req.admin_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(req.created_at).toLocaleString()}
                      {req.resolved_at && ` → ${new Date(req.resolved_at).toLocaleString()}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <a href={`/admin/users/${req.user_id}`} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> View User
                      </a>
                      {req.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleAction(req.id, "approved")} loading={processing === req.id}>
                            <CheckCircle size={14} className="mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleAction(req.id, "rejected")} loading={processing === req.id}>
                            <XCircle size={14} className="mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
