import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, phone, maps_link, location_desc, house_type, photos, points, referral_code, referred_by, members } = body;

    if (!full_name || !phone || !maps_link) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        full_name, phone, maps_link, location_desc, house_type,
        photos: photos || [], points: points || 0,
        referral_code, referred_by,
      })
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

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
