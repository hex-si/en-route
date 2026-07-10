"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Users, CheckCircle, ArrowRight, Trophy, Search, Clock, AlertCircle, ChevronRight, ChevronDown, MessageCircle, Mail, Info, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { FeatureGuideTrigger } from "@/components/FeatureGuide";
import { AdBanner } from "@/components/AdBanner";
import { HeroMedia } from "@/components/HeroMedia";

interface LeaderboardEntry {
  referral_count: number;
  full_name: string;
}

interface SearchResult {
  registered: boolean;
  full_name?: string;
  verification_status?: string;
  points?: number;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending_verification: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  verified: { label: "Verified", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  needs_clarification: { label: "Needs Info", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
};

export default function HomePage() {
  const [count, setCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [displayCount, setDisplayCount] = useState(0);
  const [showVisited, setShowVisited] = useState(false);
  const [visitedCount, setVisitedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  // Animate count on load
  useEffect(() => {
    if (count === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(count / 30));
    const timer = setInterval(() => {
      current += step;
      if (current >= count) {
        current = count;
        clearInterval(timer);
      }
      setDisplayCount(current);
    }, 50);
    return () => clearInterval(timer);
  }, [count]);

  // Toggle between household count and visited count every 5 seconds
  useEffect(() => {
    if (count === 0) return;
    const timer = setInterval(() => {
      setShowVisited((v) => !v);
    }, 5000);
    return () => clearInterval(timer);
  }, [count]);

  // Realtime page_views subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("page_views_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "page_views" }, () => {
        fetch("/api/views").then((r) => r.json()).then((d) => setVisitedCount(d.count || 0)).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime household count subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("households_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        supabase.from("users").select("*", { count: "exact", head: true }).then(({ count }) => {
          setCount(count || 0);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { count: c } = await supabase.from("users").select("*", { count: "exact", head: true });
      setCount(c || 0);

      // Record this visit
      fetch("/api/views", { method: "POST" }).catch(() => {});

      // Get real visit count
      try {
        const vRes = await fetch("/api/views");
        const vData = await vRes.json();
        setVisitedCount(vData.count || 0);
      } catch {}

      const { data: allRefs } = await supabase.from("referrals").select("referrer_id");
      if (allRefs && allRefs.length > 0) {
        const counts: Record<string, number> = {};
        allRefs.forEach((r) => { counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const ids = sorted.map(([id]) => id);
        if (ids.length > 0) {
          const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
          const nameMap: Record<string, string> = {};
          names?.forEach((n) => { nameMap[n.id] = n.full_name; });
          setLeaderboard(sorted.map(([id, refCount]) => ({
            referral_count: refCount,
            full_name: nameMap[id] || "Anonymous",
          })));
        }
      }

      try {
        const res = await fetch("/api/updates");
        const data = await res.json();
        setUpdates(data.updates || []);
      } catch {}

      try {
        const aRes = await fetch("/api/areas");
        const aData = await aRes.json();
        setAreas(aData.areas || []);
      } catch {}
    } catch {}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const supabase = createClient();
      const isPhone = /^\+?\d+$/.test(searchQuery.trim());
      let data = null;
      if (isPhone) {
        const { data: d } = await supabase.from("users").select("full_name, verification_status, points").eq("phone", searchQuery.trim()).single();
        data = d;
      } else {
        const { data: d } = await supabase.from("users").select("full_name, verification_status, points").ilike("full_name", `%${searchQuery.trim()}%`).single();
        data = d;
      }
      setSearchResult(data ? { registered: true, ...data } : { registered: false });
    } catch {
      setSearchResult({ registered: false });
    } finally {
      setSearching(false);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Hero Media - full width banner */}
      <div className="w-full">
        <HeroMedia />
      </div>

      {/* Animated Count & CTA */}
      <div className="max-w-lg mx-auto px-5 pt-6 pb-6 text-center">
        {/* Animated Count */}
        <div className="inline-flex items-center gap-2 bg-white px-5 py-3 rounded-full border border-[var(--border)] shadow-sm mb-6">
          <Users size={16} className="text-[var(--primary)]" />
          <div className="relative h-7 overflow-hidden">
            <span className={`text-lg font-bold text-[var(--primary)] transition-all duration-500 ${showVisited ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
              {displayCount.toLocaleString()}
            </span>
            <span className={`absolute inset-0 flex items-center text-lg font-bold text-[var(--primary)] transition-all duration-500 ${showVisited ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
              {visitedCount.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">{showVisited ? "total visits" : "households"}</span>
        </div>

        {/* CTA */}
        <Link
          href="/register"
          className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-4 rounded-2xl font-semibold text-lg hover:bg-[var(--primary-dark)] transition shadow-lg shadow-green-200 active:scale-[0.98]"
        >
          Register Your Household
          <ArrowRight size={20} />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition">
            Go to Dashboard
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/check" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition">
            Check Status
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5 pb-12">
        {/* Active Areas */}
        {areas.length > 0 && (
          <Card className="border-[var(--primary)]/20">
            <CardContent className="py-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <Navigation size={14} className="text-[var(--primary)]" /> Where We Are Mapping
              </p>
              <div className="flex flex-wrap gap-2">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    <MapPin size={12} />
                    {area.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Check */}
        <Card className="border-[var(--primary)]/20">
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Search size={14} className="text-[var(--primary)]" /> Check Registration
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Phone number or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" loading={searching}>Search</Button>
            </form>
            {searchResult && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                {searchResult.registered ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{searchResult.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {searchResult.verification_status && (() => {
                          const cfg = statusConfig[searchResult.verification_status];
                          if (!cfg) return null;
                          const Icon = cfg.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                              <Icon size={10} /> {cfg.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <Link href="/dashboard" className="text-[var(--primary)] text-sm font-medium flex items-center gap-0.5">
                      Dashboard <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">Not registered yet</p>
                    <Link href="/register" className="text-[var(--primary)] text-sm font-medium flex items-center gap-0.5">
                      Register <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--border)]"
        >
          <span className="text-sm font-medium">How it works</span>
          <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${showFeatures ? "rotate-180" : ""}`} />
        </button>
        {showFeatures && (
          <div className="space-y-2 pl-1">
            <FeatureGuideTrigger guideKey="pin">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition cursor-pointer active:scale-[0.98]">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Google Maps Pin</p>
                  <p className="text-xs text-[var(--text-secondary)]">Drop a pin on your house</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text-secondary)]" />
              </div>
            </FeatureGuideTrigger>
            <FeatureGuideTrigger guideKey="photo">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition cursor-pointer active:scale-[0.98]">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">House Photos</p>
                  <p className="text-xs text-[var(--text-secondary)]">Up to 4 photos — front, gate, landmark, road</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text-secondary)]" />
              </div>
            </FeatureGuideTrigger>
            <FeatureGuideTrigger guideKey="member">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition cursor-pointer active:scale-[0.98]">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Add Household Members</p>
                  <p className="text-xs text-[var(--text-secondary)]">Everyone at your address with a phone</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text-secondary)]" />
              </div>
            </FeatureGuideTrigger>
            <FeatureGuideTrigger guideKey="refer">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition cursor-pointer active:scale-[0.98]">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Trophy size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Earn &amp; Refer</p>
                  <p className="text-xs text-[var(--text-secondary)]">Up to 30 points + 10 per referral</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text-secondary)]" />
              </div>
            </FeatureGuideTrigger>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" /> Top Referrers
              </p>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]">
                        {getInitials(entry.full_name)}
                      </span>
                      <span className="text-sm">{getInitials(entry.full_name)}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{entry.referral_count} referrals</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* More */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--border)]"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-[var(--text-secondary)]" />
            <span className="text-sm font-medium">More</span>
          </div>
          <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>
        {showMore && (
          <div className="space-y-2 pl-1">
            <Link
              href="/about"
              className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition"
            >
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <Info size={16} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">About Us</p>
                <p className="text-xs text-[var(--text-secondary)]">Learn about Project EN-ROUTE</p>
              </div>
              <ChevronRight size={14} className="text-[var(--text-secondary)]" />
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition"
            >
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <Info size={16} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Privacy & Policy</p>
                <p className="text-xs text-[var(--text-secondary)]">How we protect your data</p>
              </div>
              <ChevronRight size={14} className="text-[var(--text-secondary)]" />
            </Link>
          </div>
        )}

        {/* Contact Us */}
        <button
          onClick={() => setShowContact(!showContact)}
          className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--border)]"
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-[var(--text-secondary)]" />
            <span className="text-sm font-medium">Contact Us</span>
          </div>
          <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${showContact ? "rotate-180" : ""}`} />
        </button>
        {showContact && (
          <div className="space-y-2 pl-1">
            <a
              href="https://wa.me/917005498122"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-green-300 hover:bg-green-50 transition"
            >
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <MessageCircle size={16} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-[var(--text-secondary)]">+91 7005498122</p>
              </div>
            </a>
            <a
              href="mailto:hashtagdropee@gmail.com"
              className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[var(--border)] hover:border-red-300 hover:bg-red-50 transition"
            >
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                <Mail size={16} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-[var(--text-secondary)]">hashtagdropee@gmail.com</p>
              </div>
            </a>
          </div>
        )}

        {/* Updates */}
        <Link
          href="/updates"
          className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-[var(--text-secondary)]" />
            <span className="text-sm font-medium">Updates</span>
            {updates.length > 0 && (
              <span className="text-xs bg-[var(--primary)] text-white px-2 py-0.5 rounded-full">{updates.length}</span>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)]" />
        </Link>

        <p className="text-center text-xs text-[var(--text-secondary)] pt-4">
          A Hashtag Dropee Initiative — eX Holdings
        </p>

        <a
          href="https://instagram.com/hashtagdropee"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition mt-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          Follow us on Instagram @hashtagdropee
        </a>

        {/* Ad Banners */}
        <div className="pt-4">
          <AdBanner position="landing" />
        </div>
      </div>
    </main>
  );
}
