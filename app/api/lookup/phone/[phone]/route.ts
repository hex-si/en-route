import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("users").select("full_name, verification_status, points").eq("phone", phone).single();
    if (error || !data) return NextResponse.json({ registered: false });
    return NextResponse.json({ registered: true, ...data });
  } catch {
    return NextResponse.json({ registered: false });
  }
}
