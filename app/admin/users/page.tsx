"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Eye, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const statusColors: Record<string, string> = {
  pending_verification: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  needs_clarification: "bg-orange-100 text-orange-700",
};

interface User {
  id: string;
  full_name: string;
  phone: string;
  points: number;
  verification_status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setLastRefresh(new Date());
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">Users ({total})</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:flex-none">
            <Input placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
            <Button type="submit" size="sm"><Search size={16} /></Button>
          </form>
          <Button size="sm" variant="secondary" onClick={() => fetchUsers()} loading={loading}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["", "pending_verification", "verified", "needs_clarification"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? "bg-[var(--primary)] text-white" : "bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50"}`}
          >
            {s ? s.replace(/_/g, " ") : "All"}
          </button>
        ))}
      </div>

      {loading && users.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Link key={user.id} href={`/admin/users/${user.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{user.phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[user.verification_status] || ""}`}>
                      {user.verification_status?.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-semibold text-[var(--primary)]">{user.points} pts</span>
                    <Eye size={16} className="text-[var(--text-secondary)]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
