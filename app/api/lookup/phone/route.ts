import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const supabase = createAdminClient();
  const { phone } = await params;
  const { data, error } = await supabase.from("users").select("*").eq("phone", phone).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
