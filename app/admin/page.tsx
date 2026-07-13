"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, FileText, MapPin, TrendingUp, Clock, CheckCircle, XCircle, ArrowRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Stats {
  totalUsers: number;
  totalMembers: number;
  totalPendingRequests: number;
  totalApprovedRequests: number;
  totalRejectedRequests: number;
  totalZones: number;
  totalAreas: number;
  totalVillages: number;
  verifiedUsers: number;
  pendingUsers: number;
  needsInfoUsers: number;
}

interface RecentActivity {
  id: string;
  type: "registration" | "request" | "verification";
  message: string;
  time: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const [
        usersRes,
        membersRes,
        pendingRes,
        approvedRes,
        rejectedRes,
        zonesRes,
        areasRes,
        villagesRes,
        verifiedRes,
        pendingUsersRes,
        needsInfoRes,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("household_members").select("*", { count: "exact", head: true }),
        supabase.from("update_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("update_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("update_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("zones").select("*", { count: "exact", head: true }),
        supabase.from("areas").select("*", { count: "exact", head: true }),
        supabase.from("villages").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("verification_status", "pending_verification"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("verification_status", "needs_clarification"),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalPendingRequests: pendingRes.count || 0,
        totalApprovedRequests: approvedRes.count || 0,
        totalRejectedRequests: rejectedRes.count || 0,
        totalZones: zonesRes.count || 0,
        totalAreas: areasRes.count || 0,
        totalVillages: villagesRes.count || 0,
        verifiedUsers: verifiedRes.count || 0,
        pendingUsers: pendingUsersRes.count || 0,
        needsInfoUsers: needsInfoRes.count || 0,
      });

      // Fetch recent registrations
      const { data: recentUsers } = await supabase
        .from("users")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent requests
      const { data: recentRequests } = await supabase
        .from("update_requests")
        .select("id, field, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];

      recentUsers?.forEach((u) => {
        activities.push({
          id: u.id,
          type: "registration",
          message: `New household registered`,
          time: u.created_at,
        });
      });

      recentRequests?.forEach((r) => {
        activities.push({
          id: r.id,
          type: "request",
          message: `${r.field.replace(/_/g, " ")} request ${r.status}`,
          time: r.created_at,
        });
      });

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 8));
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return null;

  const verificationRate = stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">Overview of your household registry</p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--primary)]/90 transition"
        >
          View Users <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-md transition">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-[var(--text-secondary)]">Households</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
                <p className="text-xs text-[var(--text-secondary)]">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPendingRequests}</p>
                <p className="text-xs text-[var(--text-secondary)]">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verificationRate}%</p>
                <p className="text-xs text-[var(--text-secondary)]">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Zones</span>
              <span className="font-bold text-sm">{stats.totalZones}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Areas</span>
              <span className="font-bold text-sm">{stats.totalAreas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Villages</span>
              <span className="font-bold text-sm">{stats.totalVillages}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Needs Info</span>
              <span className="font-bold text-sm text-orange-600">{stats.needsInfoUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Breakdown */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileText size={16} className="text-[var(--primary)]" /> Request Status
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-yellow-500" />
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${stats.totalPendingRequests / Math.max(stats.totalPendingRequests + stats.totalApprovedRequests + stats.totalRejectedRequests, 1) * 100}%` }} />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.totalPendingRequests}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-sm">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${stats.totalApprovedRequests / Math.max(stats.totalPendingRequests + stats.totalApprovedRequests + stats.totalRejectedRequests, 1) * 100}%` }} />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.totalApprovedRequests}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <span className="text-sm">Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${stats.totalRejectedRequests / Math.max(stats.totalPendingRequests + stats.totalApprovedRequests + stats.totalRejectedRequests, 1) * 100}%` }} />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.totalRejectedRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Activity size={16} className="text-[var(--primary)]" /> Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      activity.type === "registration" ? "bg-blue-400" :
                      activity.type === "request" ? "bg-yellow-400" : "bg-green-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.message}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
