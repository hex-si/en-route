import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phonesMatch } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, phone, maps_link, location, location_desc, house_type, photos, points, referral_code, referred_by, members, mapping_project_id, latitude, longitude } = body;

    if (!full_name || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const insertData: Record<string, unknown> = {
      full_name, phone,
      location: location || null,
      location_desc: location_desc || null,
      house_type, photos: photos || [], points: points || 0,
      referral_code, referred_by,
    };
    if (maps_link) insertData.maps_link = maps_link;
    if (latitude) insertData.latitude = latitude;
    if (longitude) insertData.longitude = longitude;
    if (mapping_project_id) insertData.mapping_project_id = mapping_project_id;

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert(insertData)
      .select("id")
      .single();

    if (userError) {
      if (userError.code === "23505") {
        return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
      }
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Insert members
    if (members && members.length > 0) {
      await supabase.from("household_members").insert(
        members.map((m: { name: string; phone: string }) => ({ user_id: user.id, name: m.name, phone: m.phone }))
      );
    }

    // If this registrant was previously listed as a household member of another
    // user, link the two accounts and mark the member row as promoted.
    const { data: linkedMember } = await supabase
      .from("household_members")
      .select("id, user_id")
      .filter("promoted_user_id", "is", null)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (linkedMember) {
      await supabase.from("users").update({ head_user_id: linkedMember.user_id }).eq("id", user.id);
      await supabase.from("household_members").update({ promoted_user_id: user.id }).eq("id", linkedMember.id);
    } else {
      // Fallback: match by normalized phone (handles "+91" vs bare formatting).
      const { data: allMembers } = await supabase
        .from("household_members")
        .select("id, user_id, phone")
        .filter("promoted_user_id", "is", null);
      const match = (allMembers || []).find((m) => phonesMatch(m.phone, phone));
      if (match) {
        await supabase.from("users").update({ head_user_id: match.user_id }).eq("id", user.id);
        await supabase.from("household_members").update({ promoted_user_id: user.id }).eq("id", match.id);
      }
    }

    // Auto-generate household registration ID from location
    const loc = (location || location_desc || "").trim();
    if (loc) {
      const { data: zones } = await supabase.from("zones").select("id, name");
      let zoneToUse: { id: string } | null = null;
      if (zones && zones.length > 0) {
        const locLower = loc.toLowerCase();
        const matched = zones.find((z) => locLower.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(locLower));
        if (matched) zoneToUse = matched;
      }
      if (!zoneToUse) {
        const prefix = loc.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
        const { data: newZone } = await supabase.from("zones").insert({ name: loc, prefix }).select("id").single();
        if (newZone) zoneToUse = newZone;
      }
      if (zoneToUse) {
        const { data: regId } = await supabase.rpc("generate_household_registration_id", { zone_uuid: zoneToUse.id, area_uuid: null });
        if (regId) {
          await supabase.from("users").update({ zone_id: zoneToUse.id, household_registration_id: regId, location: loc }).eq("id", user.id);
        }
      }
    }

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
