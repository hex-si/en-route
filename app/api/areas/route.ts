import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("areas")
      .select("id, name, description, is_active, created_at")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ areas: data });
  } catch {
    return NextResponse.json({ areas: [] });
  }
}
