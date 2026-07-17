import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendHostingerMail } from "../lib/hostinger-mail";

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function redirectOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }
  return process.env.PUBLIC_APP_URL ?? "https://__APP_DOMAIN__";
}

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json() as { email?: unknown };
  } catch {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const supabaseUrl = requiredEnvironmentVariable("SUPABASE_URL");
    const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
    const hostingerToken = requiredEnvironmentVariable("HOSTINGER_MAIL_API_TOKEN");
    const mailboxId = requiredEnvironmentVariable("HOSTINGER_MAILBOX_ID");
    const fromAddress = requiredEnvironmentVariable("HOSTINGER_MAIL_FROM");
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
    });
    const { data: claimed, error: claimError } = await admin.rpc("claim_auth_email_send", {
      p_email_hash: fingerprint(email),
      p_ip_hash: fingerprint(forwardedFor)
    });

    if (claimError) throw claimError;
    if (!claimed) {
      return Response.json(
        { error: "Too many sign-in links requested. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: redirectOrigin(request) }
    });
    const actionLink = data.properties?.action_link;
    if (error || !actionLink) {
      throw error ?? new Error("The magic link could not be generated.");
    }

    const safeLink = escapeHtml(actionLink);
    await sendHostingerMail({
      displayName: "__APP_TITLE__",
      mailboxId,
      token: hostingerToken,
      to: email,
      subject: "Your secure link to __APP_TITLE__",
      text: `Open your private workspace:\n\n${actionLink}\n\nIf you did not request this, ignore this email.`,
      html: `<div style="margin:0;padding:32px;background:#fbfbfa;color:#1f1f23;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;border:1px solid #e8e8e5;border-radius:24px;background:#fff"><div style="padding:32px"><p style="margin:0 0 22px;font-size:12px;letter-spacing:.12em;color:#6f6f76">__APP_TITLE__</p><h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;font-weight:400">Your secure sign-in link.</h1><p style="margin:0 0 26px;color:#6f6f76;line-height:1.6">Open your private workspace. This link is intended only for you.</p><a href="${safeLink}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#1f1f23;color:#fff;text-decoration:none;font-weight:700">Open __APP_TITLE__</a><p style="margin:26px 0 0;font-size:12px;color:#8a8a90;line-height:1.5">Sent through ${escapeHtml(fromAddress)}. If you did not request this, ignore this email.</p></div></div></div>`
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[auth:magic-link] Hostinger delivery failed", error);
    return Response.json({ error: "Email sign-in is temporarily unavailable." }, { status: 503 });
  }
}
