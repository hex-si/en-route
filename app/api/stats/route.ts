import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });

    const { data: allRefs } = await supabase.from("referrals").select("referrer_id");

    let topReferrers: { referral_count: number; full_name: string }[] = [];
    if (allRefs && allRefs.length > 0) {
      const counts: Record<string, number> = {};
      allRefs.forEach((r) => { counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const ids = sorted.map(([id]) => id);
      if (ids.length > 0) {
        const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
        const nameMap: Record<string, string> = {};
        names?.forEach((n) => { nameMap[n.id] = n.full_name; });
        topReferrers = sorted.map(([id, refCount]) => ({
          referral_count: refCount,
          full_name: nameMap[id] || "Anonymous",
        }));
      }
    }

    return NextResponse.json({ count: count || 0, leaderboard: topReferrers });
  } catch {
    return NextResponse.json({ count: 0, leaderboard: [] });
  }
}
