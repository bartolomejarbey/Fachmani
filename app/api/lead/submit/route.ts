import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// POST /api/lead/submit
// Landing-page poptávka. Dva režimy:
//   mode "register" — vytvoří účet (email+heslo) + rovnou poptávku. Primární cesta.
//   mode "lead"     — bez účtu: uloží kontakt + poptávku do campaign_leads (skrytá možnost).
// GDPR: vyžaduje explicitní souhlas (gdpr=true), ukládá timestamp + zdroj, IP jen hashovaně.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  mode?: "register" | "lead";
  email?: string;
  password?: string;
  phone?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  description?: string;
  location?: string;
  source?: string;
  gdpr?: boolean;
};

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const description = (body.description || "").trim().slice(0, 2000);
  const location = (body.location || "").trim().slice(0, 120);
  const phone = (body.phone || "").trim().slice(0, 40) || null;
  const source = (body.source || "landing").slice(0, 60);
  const categoryId = body.categoryId || null;
  const categoryName = (body.categoryName || "").slice(0, 120) || null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Zadejte platný e-mail." }, { status: 400 });
  }
  if (body.gdpr !== true) {
    return NextResponse.json({ error: "Je nutný souhlas se zpracováním údajů." }, { status: 400 });
  }
  if (description.length < 5) {
    return NextResponse.json({ error: "Popište prosím krátce, co potřebujete." }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;
  const sb = admin();

  // -------- LEAD (bez účtu) --------
  if (body.mode === "lead") {
    const { error } = await sb.from("campaign_leads").insert({
      email,
      phone,
      category_id: categoryId,
      category_name: categoryName,
      description,
      location,
      source,
      gdpr_consented_at: new Date().toISOString(),
      ip_hash: ipHash,
    });
    if (error) {
      console.error("[lead/submit] lead insert:", error.message);
      return NextResponse.json({ error: "Něco se pokazilo. Zkuste to prosím znovu." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, mode: "lead" });
  }

  // -------- REGISTER (účet + poptávka) --------
  const password = body.password || "";
  if (password.length < 6) {
    return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
  }

  // 1) Vytvoř účet (rovnou aktivní — mega jednoduchá registrace na LP).
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "customer",
      terms_agreed_at: new Date().toISOString(),
      lead_source: source,
    },
  });

  if (createErr || !created?.user) {
    const msg = (createErr?.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exist")) {
      return NextResponse.json(
        { error: "Tento e-mail už je registrovaný. Přihlaste se prosím.", code: "exists" },
        { status: 409 },
      );
    }
    console.error("[lead/submit] createUser:", createErr?.message);
    return NextResponse.json({ error: "Účet se nepodařilo vytvořit. Zkuste to prosím znovu." }, { status: 500 });
  }

  const uid = created.user.id;

  // 2) Profil (trigger handle_new_user nemusí existovat → upsert ručně).
  await sb.from("profiles").upsert(
    { id: uid, email, role: "customer", full_name: email.split("@")[0], phone, push_opt_in: false },
    { onConflict: "id" },
  );

  // 3) Poptávka (request) — expirace 30 dní. Trigger ohlídá denní/promo limit (free účet OK).
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const title = (categoryName ? `${categoryName}: ` : "") + (description.slice(0, 60) || "Poptávka");
  const { data: reqRow, error: reqErr } = await sb
    .from("requests")
    .insert({
      user_id: uid,
      category_id: categoryId,
      title: title.slice(0, 200),
      description,
      location,
      status: "active",
      expires_at: expiresAt.toISOString(),
      images: [],
    })
    .select("id")
    .single();

  if (reqErr) {
    // Účet je vytvořený; poptávku doplní v dashboardu. Nehlásíme jako fatal.
    console.error("[lead/submit] request insert:", reqErr.message);
    return NextResponse.json({ ok: true, mode: "register", requestCreated: false });
  }

  return NextResponse.json({ ok: true, mode: "register", requestId: reqRow.id });
}
