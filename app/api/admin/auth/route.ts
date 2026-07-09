import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateKey = `admin-auth:${ip}`;

    const { phone, password, securityAnswer } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Password login
    if (password) {
      const rate = checkRateLimit(rateKey);
      if (!rate.allowed) {
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${rate.resetIn}s.` },
          { status: 429 }
        );
      }

      const passwordHash = await hashPassword(password);
      const { data: admin, error } = await supabase
        .from("admins")
        .select("id")
        .eq("phone", phone)
        .eq("password_hash", passwordHash)
        .single();

      if (error || !admin) {
        return NextResponse.json(
          { error: `Invalid credentials. ${rate.remaining} attempt(s) left.` },
          { status: 401 }
        );
      }

      resetRateLimit(rateKey);
      return NextResponse.json({ ok: true });
    }

    // Security answer login
    if (securityAnswer) {
      const rate = checkRateLimit(rateKey);
      if (!rate.allowed) {
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${rate.resetIn}s.` },
          { status: 429 }
        );
      }

      const answerHash = await hashPassword(securityAnswer.toLowerCase().trim());
      const { data: admin, error } = await supabase
        .from("admins")
        .select("id")
        .eq("phone", phone)
        .eq("security_answer", answerHash)
        .single();

      if (error || !admin) {
        return NextResponse.json(
          { error: `Invalid answer. ${rate.remaining} attempt(s) left.` },
          { status: 401 }
        );
      }

      resetRateLimit(rateKey);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
