import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    await supabase.from("household_members").delete().eq("user_id", id);
    await supabase.from("update_requests").delete().eq("user_id", id);
    await supabase.from("referrals").delete().or(`referrer_id.eq.${id},referred_user_id.eq.${id}`);
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
