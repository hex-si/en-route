import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("updates")
      .select("id, title, content, link_url, link_label, is_published, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ updates: [] });
    }

    return NextResponse.json({ updates: data || [] });
  } catch {
    return NextResponse.json({ updates: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { title, content, image_data, link_url, link_label, is_published } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("updates")
      .insert({ title, content, image_data, link_url, link_label, is_published })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ update: data });
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
