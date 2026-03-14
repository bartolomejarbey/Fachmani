import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_TEMPLATES = [
  {
    name: "Úvodní kontakt",
    subject: "Úvodní konzultace - {firma_poradce}",
    body: "Dobrý den {jmeno_klienta},\n\nděkuji za Váš zájem o finanční poradenství. Rád bych si s Vámi domluvil úvodní bezplatnou konzultaci, kde probereme Vaše potřeby a možnosti.\n\nMůžeme se spojit na telefonním čísle {telefon_poradce} nebo odpovědět na tento email.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Nabídka",
    subject: "Nabídka - {nazev_dealu}",
    body: "Dobrý den {jmeno_klienta},\n\nna základě naší schůzky Vám posílám nabídku týkající se {nazev_dealu} v hodnotě {hodnota_dealu}.\n\nV příloze najdete podrobné informace. Pokud budete mít jakékoliv dotazy, neváhejte se ozvat.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Follow-up",
    subject: "Navázání na naši komunikaci",
    body: "Dobrý den {jmeno_klienta},\n\nchtěl bych navázat na naši předchozí komunikaci ohledně {nazev_dealu}. Máte nějaké nové otázky nebo se chcete posunout dál?\n\nRád Vám pomohu s dalšími kroky.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Poděkování",
    subject: "Děkujeme za Vaši důvěru",
    body: "Dobrý den {jmeno_klienta},\n\nděkuji za Vaši důvěru a těším se na další spolupráci. Pokud budete cokoli potřebovat, jsem Vám k dispozici.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Připomínka",
    subject: "Připomínka - {nazev_dealu}",
    body: "Dobrý den {jmeno_klienta},\n\nrád bych Vám připomněl naši domluvenou schůzku/termín ohledně {nazev_dealu}.\n\nPokud potřebujete termín změnit, dejte mi prosím vědět.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
];

const TEMPLATE_VARS = [
  "jmeno_klienta",
  "prijmeni_klienta",
  "nazev_dealu",
  "hodnota_dealu",
  "jmeno_poradce",
  "firma_poradce",
  "telefon_poradce",
];

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await supabaseAdmin
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Delete existing default templates
  await supabaseAdmin
    .from("email_templates")
    .delete()
    .eq("advisor_id", advisor.id)
    .eq("is_default", true);

  // Insert fresh defaults
  const { error } = await supabaseAdmin.from("email_templates").insert(
    DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      advisor_id: advisor.id,
      variables: TEMPLATE_VARS,
    }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: DEFAULT_TEMPLATES.length });
}
