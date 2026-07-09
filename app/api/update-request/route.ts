import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { user_id, field, new_value } = await request.json();
    if (!user_id || !field || !new_value) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from("update_requests").insert({ user_id, field, new_value });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
