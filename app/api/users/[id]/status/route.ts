import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body.verification_status || body.status;
  const clarificationNote = body.clarification_note || null;
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { verification_status: status };
  if (status === "needs_clarification" && clarificationNote) {
    updateData.clarification_note = clarificationNote;
  } else if (status !== "needs_clarification") {
    updateData.clarification_note = null;
  }

  let { error } = await supabase.from("users").update(updateData).eq("id", id);
  // Fallback if clarification_note column does not exist yet
  if (error && /clarification_note/.test(error.message)) {
    const { error: fallbackError } = await supabase.from("users").update({ verification_status: status }).eq("id", id);
    error = fallbackError;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user phone for WhatsApp
  if (status === "needs_clarification" && clarificationNote) {
    const { data: user } = await supabase.from("users").select("phone, full_name").eq("id", id).single();
    if (user) {
      const phone = user.phone.replace(/[^0-9]/g, "");
      const message = encodeURIComponent(`Hi ${user.full_name},\n\nYour En-Route verification needs some clarification:\n\n"${clarificationNote}"\n\nPlease update your information at: ${process.env.NEXT_PUBLIC_SITE_URL || "https://discoverukhrul.site"}/dashboard`);
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
      return NextResponse.json({ ok: true, whatsappUrl });
    }
  }

  return NextResponse.json({ ok: true });
}
