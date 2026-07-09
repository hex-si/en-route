import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("ads").select("id, title, description, image_url, link_url, is_active, position, created_at").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ads: data });
  } catch {
    return NextResponse.json({ ads: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, image_url, image_data, video_data, link_url, position } = body;

    if (!title || !link_url) {
      return NextResponse.json({ error: "Title and link URL are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const insertData: Record<string, unknown> = {
      title: title.trim(),
      link_url: link_url.trim(),
      position: position || "both",
    };
    if (description) insertData.description = description.trim();
    if (image_url) insertData.image_url = image_url.trim();
    if (image_data) insertData.image_data = image_data;
    if (video_data) insertData.video_data = video_data;

    const { data, error } = await supabase.from("ads").insert(insertData).select("id, title, description, image_url, link_url, is_active, position, created_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ad: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
