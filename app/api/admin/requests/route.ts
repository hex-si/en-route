import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedFields = ["full_name", "phone", "maps_link", "location_desc", "photos", "house_type", "clarification_note"];

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("update_requests")
    .select("*, users(full_name, phone)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    const supabase = createAdminClient();

    const { data: req, error: fetchError } = await supabase
      .from("update_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    if (status === "approved" && allowedFields.includes(req.field)) {
      const { error: updateError } = await supabase.from("users").update({ [req.field]: req.new_value }).eq("id", req.user_id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Independence request: detach the member from the head's household,
    // generate a new household_registration_id in the same zone, and make
    // them an independent household head.
    if (status === "approved" && req.field === "independent_household") {
      // 1. Find the old household head to get the zone
      const { data: memberUser } = await supabase
        .from("users")
        .select("head_user_id, zone_id")
        .eq("id", req.user_id)
        .single();

      // 2. Remove from old household's member list
      await supabase
        .from("household_members")
        .delete()
        .eq("promoted_user_id", req.user_id);

      // 3. Use the old head's zone if the member doesn't have one
      const zoneId = memberUser?.zone_id || (memberUser?.head_user_id
        ? (await supabase.from("users").select("zone_id").eq("id", memberUser.head_user_id).single()).data?.zone_id
        : null);

      // 4. Generate new household_registration_id if zone exists
      let newRegId = null;
      if (zoneId) {
        const { data: regId } = await supabase.rpc("generate_household_registration_id", {
          zone_uuid: zoneId,
        });
        newRegId = regId;
      }

      // 5. Update user to be independent head with new ID
      const updateData: Record<string, unknown> = { head_user_id: null };
      if (newRegId) updateData.household_registration_id = newRegId;
      if (zoneId) updateData.zone_id = zoneId;

      await supabase
        .from("users")
        .update(updateData)
        .eq("id", req.user_id);
    }

    const { error: resolveError } = await supabase
      .from("update_requests")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);

    if (resolveError) return NextResponse.json({ error: resolveError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
