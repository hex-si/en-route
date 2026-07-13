import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("mapping_projects")
    .select("*")
    .eq("is_active", true)
    .single();
  if (error) return NextResponse.json({ error: "No active mapping project" }, { status: 404 });
  return NextResponse.json({ project: data });
}
