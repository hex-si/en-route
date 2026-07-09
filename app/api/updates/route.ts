import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("updates")
      .select("id, title, content, image_data, link_url, link_label, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ updates: [] });
    }

    return NextResponse.json({ updates: data || [] });
  } catch {
    return NextResponse.json({ updates: [] });
  }
}
