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

    // Independence request: detach the member from the head's household so they
    // become a fully independent head who can manage their own members.
    if (status === "approved" && req.field === "independent_household") {
      const { error: deleteError } = await supabase
        .from("household_members")
        .delete()
        .eq("promoted_user_id", req.user_id);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

      const { error: headError } = await supabase
        .from("users")
        .update({ head_user_id: null })
        .eq("id", req.user_id);
      if (headError) return NextResponse.json({ error: headError.message }, { status: 500 });
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
