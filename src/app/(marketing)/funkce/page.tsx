"use client";

import React, { useEffect } from "react";
import Link from "next/link";

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function FeatureVisual({ type }: { type: string }) {
  const base: React.CSSProperties = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "1rem",
    padding: "1.5rem",
    minHeight: 280,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    fontFamily: "var(--font-outfit)",
    fontSize: "0.75rem",
    color: "#94a3b8",
    overflow: "hidden",
  };

  if (type === "crm") {
    return (
      <div style={base}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {["Nový", "Jednání", "Nabídka", "Uzavřeno"].map((col, i) => (
            <div key={col} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 600, fontSize: "0.6875rem", color: ["#3b82f6","#f59e0b","#8b5cf6","#22c55e"][i], marginBottom: "0.5rem" }}>{col}</div>
              {Array.from({ length: [3, 2, 2, 1][i] }).map((_, j) => (
                <div key={j} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.625rem", marginBottom: "0.375rem" }}>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, width: "70%" }} />
                  <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, width: "50%", marginTop: 4 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "portal") {
    return (
      <div style={base}>
        <div style={{ display: "flex", gap: "0.75rem", flex: 1 }}>
          <div style={{ width: 120, background: "#fff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", padding: "0.75rem" }}>
            {["Přehled", "Smlouvy", "Platby", "Investice", "Plán"].map((item, i) => (
              <div key={item} style={{ padding: "0.375rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.6875rem", background: i === 0 ? "#eff6ff" : "transparent", color: i === 0 ? "#2563eb" : "#94a3b8", marginBottom: "0.125rem" }}>{item}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {["Aktivní smlouvy", "Další platba", "Investice", "Úspory"].map((label) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.625rem", color: "#94a3b8" }}>{label}</div>
                  <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, width: "60%", marginTop: 6 }} />
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", flex: 1 }}>
              <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, width: "40%", marginBottom: 8 }} />
              <div style={{ height: 60, background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)", borderRadius: "0.375rem" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "ai") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: "0.375rem", background: "linear-gradient(135deg, #2563eb, #7c3aed)" }} />
            <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#1e293b" }}>AI Asistent</span>
          </div>
          {[
            { label: "Upsell detekováno", color: "#22c55e", text: "Klient Novák: hypotéka končí za 3 měsíce → nabídněte refinancování" },
            { label: "Shrnutí klienta", color: "#3b82f6", text: "Eva Černá — 3 smlouvy, skóre 78/100, poslední kontakt před 14 dny" },
            { label: "Doporučení", color: "#f59e0b", text: "5 klientů bez životního pojištění s aktivní hypotékou" },
          ].map((item) => (
            <div key={item.label} style={{ background: "#f8fafc", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.5rem", borderLeft: `3px solid ${item.color}` }}>
              <div style={{ fontWeight: 600, fontSize: "0.6875rem", color: item.color, marginBottom: "0.25rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "meta") {
    return (
      <div style={base}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1877f2" }} />
          <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#1e293b" }}>Meta Ads Dashboard</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {[{ label: "Leady", val: "47" }, { label: "Konverze", val: "12" }, { label: "Cena/lead", val: "89 Kč" }].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>{stat.val}</div>
              <div style={{ fontSize: "0.625rem", color: "#94a3b8" }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", flex: 1 }}>
          <div style={{ fontSize: "0.6875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Lead flow</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.25rem", height: 80 }}>
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 95].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: `linear-gradient(to top, #2563eb, #7c3aed)`, borderRadius: "2px 2px 0 0", opacity: 0.7 + (i * 0.02) }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "automation") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem", flex: 1 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Automatizace</div>
          {[
            { trigger: "Nový lead z Meta Ads", action: "→ Vytvořit deal + odeslat email", active: true },
            { trigger: "Deal neaktivní 7 dní", action: "→ Připomínka poradci", active: true },
            { trigger: "Smlouva končí za 30 dní", action: "→ Notifikace klientovi", active: true },
            { trigger: "Klient narozeniny", action: "→ Odeslat blahopřání", active: false },
          ].map((rule, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: rule.active ? "#22c55e" : "#e2e8f0", position: "relative" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: rule.active ? 16 : 2, transition: "left 0.2s" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#1e293b" }}>{rule.trigger}</div>
                <div style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{rule.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "calculators") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem", flex: 1 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Hypoteční kalkulačka</div>
          {[{ label: "Výše úvěru", val: "3 500 000 Kč" }, { label: "Úroková sazba", val: "4,2 %" }, { label: "Doba splácení", val: "30 let" }].map((field) => (
            <div key={field.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{field.label}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e293b" }}>{field.val}</span>
            </div>
          ))}
          <div style={{ marginTop: "1rem", background: "#f0f9ff", borderRadius: "0.5rem", padding: "0.75rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.625rem", color: "#2563eb", marginBottom: "0.25rem" }}>Měsíční splátka</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>17 128 Kč</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "vault") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem", flex: 1 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Dokumentový trezor</div>
          {[
            { name: "Občanský průkaz", cat: "Doklady", exp: "2028" },
            { name: "Smlouva o hypotéce", cat: "Smlouvy", exp: "—" },
            { name: "Daňové přiznání 2024", cat: "Daně", exp: "—" },
            { name: "Pojistka vozidla", cat: "Pojištění", exp: "2025" },
          ].map((doc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ width: 28, height: 32, borderRadius: "0.25rem", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#1e293b" }}>{doc.name}</div>
                <div style={{ fontSize: "0.625rem", color: "#94a3b8" }}>{doc.cat} {doc.exp !== "—" ? `· platnost do ${doc.exp}` : ""}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "scoring") {
    return (
      <div style={base}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1rem", flex: 1 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Scoring klientů</div>
          {[
            { name: "Jan Novák", score: 92, seg: "VIP" },
            { name: "Eva Černá", score: 78, seg: "Aktivní" },
            { name: "Petr Dvořák", score: 45, seg: "Pasivní" },
            { name: "Marie Svobodová", score: 88, seg: "VIP" },
          ].map((client, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${client.score > 80 ? "#22c55e" : client.score > 60 ? "#f59e0b" : "#ef4444"}, ${client.score > 80 ? "#16a34a" : client.score > 60 ? "#d97706" : "#dc2626"})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.625rem", fontWeight: 700 }}>{client.score}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#1e293b" }}>{client.name}</div>
              </div>
              <span style={{ fontSize: "0.625rem", fontWeight: 600, color: client.score > 80 ? "#22c55e" : client.score > 60 ? "#f59e0b" : "#ef4444", background: client.score > 80 ? "#f0fdf4" : client.score > 60 ? "#fffbeb" : "#fef2f2", padding: "0.125rem 0.5rem", borderRadius: "999px" }}>{client.seg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div style={base} />;
}

const featuresData = [
  {
    type: "crm",
    title: "CRM Pipeline",
    subtitle: "Obchodní případy pod kontrolou",
    desc: "Intuitivní Kanban board s drag & drop. Přesouvejte obchodní případy mezi fázemi, přidávejte poznámky, nastavujte připomínky a sledujte konverze. Každý deal má kompletní historii aktivit, dokumenty a propojení s klientem.",
    highlights: ["Drag & drop Kanban board", "Automatické připomínky a follow-upy", "Tagy, filtry a vyhledávání", "Kompletní historie aktivit"],
  },
  {
    type: "portal",
    title: "Klientský portál",
    subtitle: "Profesionální portál ve vašich barvách",
    desc: "Každý klient má přístup do portálu s vaším logem a barvami. Vidí své smlouvy, platby, investice a finanční plán. Může přidávat vlastní smlouvy, které se objeví ve frontě ke schválení. Automatická detekce úspor u úvěrů.",
    highlights: ["Vlastní branding (logo, barvy, font)", "Přidávání smluv klientem + fronta schválení", "Vizualizace snižování dluhu", "Automatická detekce úspor"],
  },
  {
    type: "ai",
    title: "AI asistent",
    subtitle: "Umělá inteligence pracuje pro vás",
    desc: "AI analyzuje data klientů a detekuje příležitosti k upsell. Automaticky identifikuje klienty s končícími smlouvami, chybějícím pojištěním nebo potenciálem k refinancování. Jedním kliknutím získáte kompletní shrnutí klienta.",
    highlights: ["Automatická detekce upsell příležitostí", "AI shrnutí klienta jedním kliknutím", "Pravidla pro detekci příležitostí", "Napojení na Anthropic Claude"],
  },
  {
    type: "meta",
    title: "Meta Ads integrace",
    subtitle: "Leady z Facebooku přímo do CRM",
    desc: "Propojte svůj Meta Ads účet a automaticky přijímejte leady. Webhook přijme formulář, vytvoří deal v pipeline a odešle data zpět přes Conversions API pro přesné měření. Dashboard ukazuje výkon kampaní v reálném čase.",
    highlights: ["Automatický příjem leadů z Facebooku", "Conversions API pro přesné měření", "Dashboard výkonu kampaní", "Propojení s CRM pipeline"],
  },
  {
    type: "automation",
    title: "Automatizace procesů",
    subtitle: "Nechte systém pracovat za vás",
    desc: "Nastavte pravidla a automatizace, které šetří čas. Automatické připomínky, follow-upy, notifikace při životních událostech klienta. Předpřipravené automatizace pro nejčastější scénáře, nebo si vytvořte vlastní.",
    highlights: ["Předpřipravené automatizace", "Vlastní pravidla (trigger → akce)", "Připomínky a follow-upy", "Notifikace životních událostí"],
  },
  {
    type: "calculators",
    title: "Finanční kalkulačky",
    subtitle: "Interaktivní nástroje pro klienty",
    desc: "Hypoteční kalkulačka, spořicí kalkulačka, důchodová kalkulačka — vše s interaktivními grafy. Klient si sám spočítá varianty a jedním kliknutím požádá o konzultaci. Vy získáte teplý lead.",
    highlights: ["Hypoteční kalkulačka", "Spořicí kalkulačka", "Důchodová kalkulačka", "CTA \u201EChci řešit s poradcem\u201C"],
  },
  {
    type: "vault",
    title: "Dokumentový trezor",
    subtitle: "Bezpečné úložiště dokumentů",
    desc: "Klienti mají bezpečný prostor pro osobní dokumenty — občanské průkazy, smlouvy, daňová přiznání. Metadata s datem expirace, automatické připomínky na prodloužení. Sdílení konkrétních dokumentů s poradcem jedním kliknutím.",
    highlights: ["Šifrované úložiště", "Kategorie dokumentů", "Připomínky expirace", "Sdílení s poradcem"],
  },
  {
    type: "scoring",
    title: "Scoring a segmentace",
    subtitle: "Zaměřte se na správné klienty",
    desc: "Automatický scoring klientů na základě aktivity, objemu smluv a engagement. Segmentace do skupin (VIP, Aktivní, Pasivní, Nový). Vědět na koho se zaměřit a kdo potřebuje pozornost.",
    highlights: ["Automatický scoring 0–100", "Segmentace do skupin", "Identifikace neaktivních klientů", "KPI dashboard"],
  },
];

export default function FunkcePage() {
  useScrollReveal();

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .feature-row { flex-direction: column !important; }
          .feature-row.reverse { flex-direction: column !important; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ padding: "10rem 1.5rem 5rem", textAlign: "center" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <p className="fade-in-up" style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Funkce</p>
          <h1 className="fade-in-up delay-1" style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "3rem", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Všechny nástroje pro <span className="gradient-text">váš úspěch</span>
          </h1>
          <p className="fade-in-up delay-2" style={{ color: "var(--color-text-secondary)", fontSize: "1.1875rem", lineHeight: 1.65, maxWidth: "36rem", margin: "0 auto" }}>
            Od CRM přes klientský portál až po AI asistenta. Všechno propojené, všechno na jednom místě.
          </p>
        </div>
      </section>

      {/* FEATURE SECTIONS */}
      {featuresData.map((feature, index) => {
        const isReverse = index % 2 === 1;
        return (
          <section key={feature.type} id={feature.type === "meta" ? "integrace" : undefined} style={{ padding: "5rem 1.5rem", background: index % 2 === 0 ? "transparent" : "#fafafa" }}>
            <div className={`feature-row scroll-reveal ${isReverse ? "reverse" : ""}`} style={{ maxWidth: "72rem", margin: "0 auto", display: "flex", alignItems: "center", gap: "4rem", flexDirection: isReverse ? "row-reverse" : "row" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{feature.subtitle}</p>
                <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "1rem" }}>{feature.title}</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>{feature.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {feature.highlights.map((h) => (
                    <li key={h} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9375rem", color: "var(--color-text)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FeatureVisual type={feature.type} />
              </div>
            </div>
          </section>
        );
      })}

      {/* SECURITY SECTION */}
      <section id="bezpecnost" style={{ padding: "5rem 1.5rem", background: "#111827", color: "#fff" }}>
        <div className="scroll-reveal" style={{ maxWidth: "48rem", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Bezpečnost</p>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "2rem", marginBottom: "1rem" }}>Bezpečnost na prvním místě</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.65, marginBottom: "2.5rem" }}>
            Row Level Security na každé tabulce. Validace vstupů, rate limiting, audit log. Vaše data a data vašich klientů jsou v bezpečí.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {["Row Level Security", "Šifrování dat", "Audit log", "Rate limiting", "Validace vstupů", "GDPR ready"].map((item) => (
              <div key={item} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "7rem 1.5rem", textAlign: "center" }}>
        <div className="scroll-reveal" style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.025em", marginBottom: "1.25rem" }}>
            Připraveni <span className="gradient-text">začít</span>?
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "1.0625rem", lineHeight: 1.65, marginBottom: "2rem" }}>14 dní zdarma. Žádná kreditní karta.</p>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--color-text)", color: "#fff", fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "1rem", padding: "1rem 2.5rem", borderRadius: "var(--radius-btn)", textDecoration: "none", transition: "all 0.25s" }}>
            Vyzkoušet zdarma
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>
    </>
  );
}
