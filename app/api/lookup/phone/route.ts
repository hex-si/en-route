import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request
) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
  const { data, error } = await supabase.from("users").select("*").eq("phone", phone).single();
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
