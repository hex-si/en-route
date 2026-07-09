"use client";
import { useState } from "react";
import { Search, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  registered: boolean;
  full_name?: string;
  verification_status?: string;
  points?: number;
}

const statusConfig = {
  pending_verification: { label: "Pending Verification", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  verified: { label: "Verified", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  needs_clarification: { label: "Needs Clarification", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
};

export default function CheckPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const supabase = createClient();
      const isPhone = /^\+?\d+$/.test(query.trim());
      let data = null;
      if (isPhone) {
        const { data: d } = await supabase.from("users").select("full_name, verification_status, points").eq("phone", query.trim()).single();
        data = d;
      } else {
        const { data: d } = await supabase.from("users").select("full_name, verification_status, points").ilike("full_name", `%${query.trim()}%`).single();
        data = d;
      }
      setResult(data ? { registered: true, ...data } : { registered: false });
    } catch {
      setResult({ registered: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
          <ArrowLeft size={16} /> Back
        </Link>

        <h1 className="text-xl font-bold mb-2">Check Registration</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Search by phone number or name to check your registration status.</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Phone number or full name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" loading={loading}>
            <Search size={18} />
          </Button>
        </form>

        {searched && result && (
          <Card>
            <CardContent className="text-center py-8">
              {result.registered ? (
                <>
                  <CheckCircle size={48} className="mx-auto text-[var(--primary)] mb-4" />
                  <h2 className="text-lg font-bold mb-1">You&apos;re registered!</h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{result.full_name}</p>
                  {result.verification_status && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[result.verification_status as keyof typeof statusConfig]?.color || ""}`}>
                      {(() => {
                        const cfg = statusConfig[result.verification_status as keyof typeof statusConfig];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return <><Icon size={14} /> {cfg.label}</>;
                      })()}
                    </div>
                  )}
                  <p className="text-sm text-[var(--text-secondary)] mt-3">Points: {result.points || 0}/30</p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} className="mx-auto text-[var(--text-secondary)] mb-4" />
                  <h2 className="text-lg font-bold mb-1">Not found</h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">No registration found for this search.</p>
                  <Link href="/register" className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[var(--primary-dark)] transition">
                    Register Now
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
