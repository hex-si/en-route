import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("areas")
      .select("id, name, description, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ areas: data });
  } catch {
    return NextResponse.json({ areas: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Area name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const insertData: Record<string, unknown> = {
      name: name.trim(),
    };
    if (description) insertData.description = description.trim();

    const { data, error } = await supabase
      .from("areas")
      .insert(insertData)
      .select("id, name, description, is_active, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ area: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
