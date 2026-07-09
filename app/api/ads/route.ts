import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const position = url.searchParams.get("position");
    const supabase = createAdminClient();

    let query = supabase.from("ads").select("id, title, description, image_url, image_data, video_data, link_url, is_active, position").eq("is_active", true).order("created_at", { ascending: false });
    if (position) {
      query = query.or(`position.eq.${position},position.eq.both`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ads: data });
  } catch {
    return NextResponse.json({ ads: [] });
  }
}
