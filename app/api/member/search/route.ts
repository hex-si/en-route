import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

/**
 * POST /api/member/search
 * Body: { query: string } — phone number or name
 * Returns: member data + household info, or 404
 */
export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const q = query.trim();
    const phone = normalizePhone(q);

    // 1. Search household_members by phone or name
    let memberQuery = supabase
      .from("household_members")
      .select("id, name, phone, user_id, created_at")
      .order("created_at", { ascending: false });

    if (phone && phone.length >= 10) {
      memberQuery = memberQuery.or(`phone.eq.${phone},phone.eq.${phone.slice(-10)}`);
    } else {
      memberQuery = memberQuery.ilike("name", `%${q}%`);
    }

    const { data: members } = await memberQuery.limit(5);

    if (members && members.length > 0) {
      // Fetch the household head for each member
      const headIds = [...new Set(members.map((m) => m.user_id))];
      const { data: heads } = await supabase
        .from("users")
        .select("id, full_name, household_registration_id, zone_id, verification_status, points, referral_code")
        .in("id", headIds);

      const headMap = new Map((heads || []).map((h) => [h.id, h]));

      // Fetch zones for the heads
      const zoneIds = [...new Set((heads || []).map((h) => h.zone_id).filter(Boolean))];
      let zoneMap = new Map<string, { name: string; prefix: string }>();
      if (zoneIds.length > 0) {
        const { data: zones } = await supabase.from("zones").select("id, name, prefix").in("id", zoneIds);
        zoneMap = new Map((zones || []).map((z) => [z.id, { name: z.name, prefix: z.prefix }]));
      }

      const results = members.map((m) => {
        const head = headMap.get(m.user_id);
        const zone = head?.zone_id ? zoneMap.get(head.zone_id) : null;
        return {
          type: "member" as const,
          member_id: m.id,
          name: m.name,
          phone: m.phone,
          household_head: head?.full_name || "Unknown",
          household_registration_id: head?.household_registration_id || null,
          zone: zone?.name || null,
          zone_prefix: zone?.prefix || null,
          head_verification_status: head?.verification_status || "pending_verification",
          head_points: head?.points || 0,
          referral_code: head?.referral_code || null,
          head_id: m.user_id,
        };
      });

      return NextResponse.json({ results });
    }

    // 2. Also search users (heads) by phone or name
    let userQuery = supabase
      .from("users")
      .select("id, full_name, phone, household_registration_id, zone_id, verification_status, points, referral_code")
      .order("created_at", { ascending: false });

    if (phone && phone.length >= 10) {
      userQuery = userQuery.or(`phone.eq.${phone},phone.eq.${phone.slice(-10)}`);
    } else {
      userQuery = userQuery.ilike("full_name", `%${q}%`);
    }

    const { data: users } = await userQuery.limit(5);

    if (users && users.length > 0) {
      const zoneIds = [...new Set(users.map((u) => u.zone_id).filter(Boolean))];
      let zoneMap = new Map<string, { name: string; prefix: string }>();
      if (zoneIds.length > 0) {
        const { data: zones } = await supabase.from("zones").select("id, name, prefix").in("id", zoneIds);
        zoneMap = new Map((zones || []).map((z) => [z.id, { name: z.name, prefix: z.prefix }]));
      }

      const results = users.map((u) => {
        const zone = u.zone_id ? zoneMap.get(u.zone_id) : null;
        return {
          type: "head" as const,
          member_id: null,
          name: u.full_name,
          phone: u.phone,
          household_head: u.full_name,
          household_registration_id: u.household_registration_id || null,
          zone: zone?.name || null,
          zone_prefix: zone?.prefix || null,
          head_verification_status: u.verification_status,
          head_points: u.points,
          referral_code: u.referral_code,
          head_id: u.id,
        };
      });

      return NextResponse.json({ results });
    }

    return NextResponse.json({ results: [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
