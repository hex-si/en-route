"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Users, CheckCircle, ArrowRight, Trophy, Search, Clock, AlertCircle, ChevronRight, ChevronDown, MessageCircle, Mail, Info, Shield, Truck, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { FeatureGuideTrigger } from "@/components/FeatureGuide";
import { AdBanner } from "@/components/AdBanner";

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
  const [displayCount, setDisplayCount] = useState(0);
  const [showVisited, setShowVisited] = useState(false);
  const [visitedCount, setVisitedCount] = useState(0);
  const [areas, setAreas] = useState<{ name: string; is_active: boolean }[]>([]);
  const [activeAreaIndex, setActiveAreaIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

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

  useEffect(() => {
    if (count === 0) return;
    const timer = setInterval(() => {
      setShowVisited((v) => !v);
    }, 5000);
    return () => clearInterval(timer);
  }, [count]);

  // Rotate active areas every 5 seconds
  useEffect(() => {
    const activeAreas = areas.filter((a) => a.is_active);
    if (activeAreas.length <= 1) return;
    const timer = setInterval(() => {
      setActiveAreaIndex((i) => (i + 1) % activeAreas.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [areas]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("page_views_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "page_views" }, () => {
        fetch("/api/views").then((r) => r.json()).then((d) => setVisitedCount(d.count || 0)).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "areas" }, () => {
        supabase.from("areas").select("name, is_active").order("created_at").then(({ data }) => {
          if (data) setAreas(data);
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

      fetch("/api/views", { method: "POST" }).catch(() => {});

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

      // Fetch areas (active + inactive for display)
      try {
        const { data: areaData } = await supabase.from("areas").select("name, is_active").order("created_at");
        if (areaData) setAreas(areaData);
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
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 min-h-[600px]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Map Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Floating Location Pins */}
          <div className="absolute top-20 left-[15%] animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-red-500/30">
              <MapPin size={20} className="text-red-400" />
            </div>
          </div>
          <div className="absolute top-32 right-[20%] animate-bounce" style={{ animationDelay: "1s", animationDuration: "3s" }}>
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-emerald-500/30">
              <Home size={16} className="text-emerald-400" />
            </div>
          </div>
          <div className="absolute bottom-40 left-[25%] animate-bounce" style={{ animationDelay: "2s", animationDuration: "3s" }}>
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30">
              <Truck size={24} className="text-blue-400" />
            </div>
          </div>

          {/* Route Lines */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M 100 200 Q 300 100 500 250 T 900 180" fill="none" stroke="url(#routeGradient)" strokeWidth="2" strokeDasharray="8 4" className="animate-pulse" />
            <path d="M 50 400 Q 250 300 450 450 T 850 350" fill="none" stroke="url(#routeGradient2)" strokeWidth="2" strokeDasharray="8 4" className="animate-pulse" style={{ animationDelay: "1s" }} />
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="routeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40" />
        </div>

        <div className="relative max-w-lg mx-auto px-5 pt-12 pb-16 text-center">
          {/* Logo / Brand */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">EN-ROUTE</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            En-Route
          </h1>
          <p className="text-xl text-emerald-300 font-medium mb-4">
            Register your household once. Get accurate deliveries forever.
          </p>
          <p className="text-base text-white/70 max-w-md mx-auto mb-8 leading-relaxed">
            Ukhrul's smart household address registration system, making deliveries faster, easier, and more accurate for every home.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-10">
            <div className="text-center">
              <div className="relative h-8 overflow-hidden">
                <span className={`text-2xl font-bold text-white transition-all duration-500 ${showVisited ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
                  {displayCount.toLocaleString()}
                </span>
                <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold text-white transition-all duration-500 ${showVisited ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                  {visitedCount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{showVisited ? "total visits" : "households registered"}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center min-w-[120px]">
              {areas.length > 0 ? (
                <>
                  <div className="relative h-8 overflow-hidden">
                    {areas.filter((a) => a.is_active).map((area, i) => {
                      const activeAreas = areas.filter((a) => a.is_active);
                      const currentIndex = activeAreaIndex % activeAreas.length;
                      const isActive = i === currentIndex;
                      return (
                        <span
                          key={area.name}
                          className={`absolute inset-0 flex items-center justify-center text-lg font-bold text-emerald-400 transition-all duration-500 ${
                            isActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                          }`}
                        >
                          {area.name}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/60 mt-1">currently mapping</p>
                  {areas.some((a) => !a.is_active) && (
                    <div className="mt-1 flex flex-wrap justify-center gap-1">
                      {areas.filter((a) => !a.is_active).map((area) => (
                        <span key={area.name} className="text-[10px] text-white/40 line-through">
                          {area.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-emerald-400">UKHRUL</p>
                  <p className="text-xs text-white/60 mt-1">mapping area</p>
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-emerald-600 hover:to-blue-600 transition-all shadow-xl shadow-emerald-500/25 active:scale-[0.98]"
          >
            Register Your Household
            <ArrowRight size={20} />
          </Link>

          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <Link href="/dashboard" className="text-white/70 hover:text-white transition flex items-center gap-1">
              Dashboard <ChevronRight size={14} />
            </Link>
            <Link href="/check" className="text-white/70 hover:text-white transition flex items-center gap-1">
              Check Status <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-lg mx-auto px-5">
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-4 rounded-2xl border border-gray-200 hover:border-emerald-200 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Info size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">How En-Route Works</p>
                <p className="text-xs text-gray-500">Four simple steps to a verified address</p>
              </div>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showFeatures ? "rotate-180" : ""}`} />
          </button>

          {showFeatures && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <FeatureGuideTrigger guideKey="pin">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <MapPin size={18} className="text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-xs mb-0.5">Create Address</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Pin your exact location on the map</p>
                </div>
              </FeatureGuideTrigger>

              <FeatureGuideTrigger guideKey="photo">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <CheckCircle size={18} className="text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-xs mb-0.5">Add Photos</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Upload up to 4 house photos</p>
                </div>
              </FeatureGuideTrigger>

              <FeatureGuideTrigger guideKey="member">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Users size={18} className="text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-xs mb-0.5">Add Members</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Register your whole household</p>
                </div>
              </FeatureGuideTrigger>

              <FeatureGuideTrigger guideKey="refer">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Trophy size={18} className="text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-xs mb-0.5">Earn Points</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Up to 30 points + 10 per referral</p>
                </div>
              </FeatureGuideTrigger>
            </div>
          )}
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white">
        <div className="max-w-lg mx-auto px-5">
          <Card className="border-gray-200 shadow-lg">
            <CardContent className="py-5">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Search size={16} className="text-emerald-600" /> Quick Registration Check
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Enter phone number or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" loading={searching}>Search</Button>
              </form>
              {searchResult && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {searchResult.registered ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{searchResult.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
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
                      <Link href="/dashboard" className="text-emerald-600 text-sm font-medium flex items-center gap-0.5 hover:text-emerald-700">
                        Dashboard <ChevronRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Not registered yet</p>
                      <Link href="/register" className="text-emerald-600 text-sm font-medium flex items-center gap-0.5 hover:text-emerald-700">
                        Register Now <ChevronRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-lg mx-auto px-5">
            <Card className="border-gray-200 shadow-lg">
              <CardContent className="py-5">
                <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" /> Top Referrers
                </p>
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-amber-100 text-amber-700" : 
                          i === 1 ? "bg-gray-100 text-gray-600" : 
                          i === 2 ? "bg-orange-100 text-orange-700" : 
                          "bg-gray-50 text-gray-500"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium">{getInitials(entry.full_name)}</span>
                      </div>
                      <span className="text-sm text-gray-500">{entry.referral_count} referrals</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* More Options */}
      <section className="py-12 bg-white">
        <div className="max-w-lg mx-auto px-5 space-y-3">
          <Link
            href="/about"
            className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Info size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">About En-Route</p>
              <p className="text-xs text-gray-500">Learn about our mission for Ukhrul</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>

          <Link
            href="/privacy"
            className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Privacy & Policy</p>
              <p className="text-xs text-gray-500">How we protect your data</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>

          <Link
            href="/updates"
            className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Info size={18} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Updates</p>
              {updates.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-2">{updates.length} new</span>
              )}
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-lg mx-auto px-5">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold mb-1">Get in Touch</h2>
            <p className="text-sm text-gray-500">Questions? We&apos;re here to help</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://wa.me/917005498122"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 bg-white p-5 rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <MessageCircle size={22} className="text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">WhatsApp</p>
                <p className="text-xs text-gray-500">+91 7005498122</p>
              </div>
            </a>
            <a
              href="mailto:hashtagdropee@gmail.com"
              className="flex flex-col items-center gap-2 bg-white p-5 rounded-2xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <Mail size={22} className="text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Email</p>
                <p className="text-xs text-gray-500">hashtagdropee@gmail.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-md flex items-center justify-center">
              <MapPin size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">EN-ROUTE</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            A Hashtag Dropee Initiative — eX Holdings
          </p>
          <a
            href="https://instagram.com/hashtagdropee"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-pink-600 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            Follow @hashtagdropee
          </a>
        </div>
      </footer>

      {/* Ad Banners */}
      <div className="max-w-lg mx-auto px-5 pb-8">
        <AdBanner position="landing" />
      </div>
    </main>
  );
}
