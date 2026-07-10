import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message, details: error.details }, { status: 500 });
  return NextResponse.json(data);
}
