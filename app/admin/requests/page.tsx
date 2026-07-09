"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface Request {
  id: string;
  user_id: string;
  field: string;
  new_value: string;
  status: string;
  admin_notes: string;
  created_at: string;
  users?: { full_name: string; phone: string };
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
  full_name: "Full Name",
  phone: "Phone Number",
  maps_link: "Google Maps Link",
  location_desc: "Location Description",
  spouse_name: "Spouse Name",
  spouse_phone: "Spouse Phone",
  family_name: "Family Member Name",
  family_phone: "Family Member Phone",
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/admin/requests");
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => { fetchRequests(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: action }),
      });
      if (res.ok) {
        toast.success(`Request ${action}`);
        fetchRequests();
      } else {
        toast.error("Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Update Requests</h1>
        <Button size="sm" variant="secondary" onClick={() => fetchRequests()} loading={loading}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {loading && requests.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No requests</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const Icon = statusIcon[req.status] || Clock;
            return (
              <Card key={req.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{req.users?.full_name || "Unknown"}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{req.users?.phone}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[req.status]}`}>
                      <Icon size={12} /> {req.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Field: <span className="font-medium text-[var(--text)]">{fieldLabels[req.field] || req.field}</span></p>
                    <p className="text-sm">{req.new_value}</p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAction(req.id, "approved")} loading={processing === req.id}>
                        <CheckCircle size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleAction(req.id, "rejected")} loading={processing === req.id}>
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
