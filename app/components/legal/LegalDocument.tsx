import React from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

/* ============================================================================
 * Sdílená komponenta pro vykreslování právních dokumentů (VOP, GDPR, DPA, ...).
 *
 * Obsah každého dokumentu je definován jako strukturovaná data (typ `LegalDoc`)
 * v příslušné stránce (app/<route>/page.tsx). Tato komponenta se stará jen
 * o vzhled, navigaci (obsah/kotvy), verzování a tisk. Texty se tak udržují
 * na jednom místě a jsou snadno přenositelné k revizi advokátem.
 * ========================================================================== */

export type LegalInline = string; // podporuje **tučně** a [text](href)

export type LegalBlock =
  | { type: "p"; text: LegalInline }
  | { type: "list"; items: LegalInline[]; ordered?: boolean }
  | { type: "table"; head: string[]; rows: LegalInline[][] }
  | { type: "callout"; variant: "info" | "warning" | "legal"; title?: string; text: LegalInline }
  | { type: "subsection"; title: string; blocks: LegalBlock[] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  /** Krátký název pro odznak nad nadpisem (např. „PRÁVNÍ DOKUMENT"). */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Verze dokumentu (např. „2.0"). */
  version: string;
  /** Datum účinnosti (lidsky čitelné, např. „1. června 2026"). */
  effectiveDate: string;
  /** Datum poslední aktualizace. */
  updatedDate?: string;
  /** Úvodní odstavec zobrazený nad obsahem. */
  intro?: LegalInline;
  sections: LegalSection[];
  /** Odkazy na související dokumenty zobrazené dole. */
  related?: { href: string; label: string }[];
};

/* --- Inline formátování: **tučně** a [text](href) ------------------------- */
function renderInline(text: string, keyPrefix = ""): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Rozdělíme na tokeny pro odkazy a tučný text.
  const regex = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}b${i}`} className="font-semibold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const internal = href.startsWith("/");
        if (internal) {
          nodes.push(
            <Link key={`${keyPrefix}l${i}`} href={href} className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2">
              {label}
            </Link>
          );
        } else {
          nodes.push(
            <a key={`${keyPrefix}l${i}`} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2">
              {label}
            </a>
          );
        }
      }
    }
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/* --- Vykreslení jednoho bloku --------------------------------------------- */
function Block({ block, k }: { block: LegalBlock; k: string }) {
  switch (block.type) {
    case "p":
      return <p className="text-gray-600 leading-relaxed mb-4">{renderInline(block.text, k)}</p>;

    case "list":
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className={`mb-4 space-y-2 text-gray-600 ${block.ordered ? "list-decimal" : "list-disc"} pl-6`}>
          {block.items.map((it, idx) => (
            <li key={`${k}-li${idx}`} className="leading-relaxed">
              {renderInline(it, `${k}-li${idx}`)}
            </li>
          ))}
        </ListTag>
      );

    case "table":
      return (
        <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {block.head.map((h, idx) => (
                  <th key={`${k}-th${idx}`} className="text-left font-semibold text-gray-900 px-4 py-3 border-b border-gray-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={`${k}-tr${ri}`} className="even:bg-gray-50/50">
                  {row.map((cell, ci) => (
                    <td key={`${k}-td${ri}-${ci}`} className="px-4 py-3 border-b border-gray-100 text-gray-600 align-top">
                      {renderInline(cell, `${k}-td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout": {
      const styles = {
        info: "bg-cyan-50 border-cyan-200 text-cyan-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        legal: "bg-slate-50 border-slate-200 text-slate-700",
      }[block.variant];
      const icon = { info: "ℹ️", warning: "⚠️", legal: "⚖️" }[block.variant];
      return (
        <div className={`mb-6 rounded-xl border p-4 ${styles}`}>
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">{icon}</span>
            <div>
              {block.title && <p className="font-semibold mb-1">{block.title}</p>}
              <p className="text-sm leading-relaxed">{renderInline(block.text, k)}</p>
            </div>
          </div>
        </div>
      );
    }

    case "subsection":
      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{block.title}</h3>
          {block.blocks.map((b, idx) => (
            <Block key={`${k}-sub${idx}`} block={b} k={`${k}-sub${idx}`} />
          ))}
        </div>
      );
  }
}

/* --- Hlavní komponenta ----------------------------------------------------- */
export default function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50" />
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            {doc.kicker || "PRÁVNÍ DOKUMENT"}
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{doc.title}</h1>
          {doc.subtitle && <p className="text-gray-600 max-w-2xl mx-auto mb-4">{doc.subtitle}</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-gray-500">
            <span>Verze {doc.version}</span>
            <span>Účinné od {doc.effectiveDate}</span>
            {doc.updatedDate && <span>Aktualizováno {doc.updatedDate}</span>}
          </div>
        </div>
      </section>

      {/* Obsah */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
            {/* Boční navigace */}
            <aside className="hidden lg:block">
              <nav className="sticky top-28">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Obsah</p>
                <ol className="space-y-2 text-sm">
                  {doc.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-gray-500 hover:text-cyan-600 transition-colors block leading-snug">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* Tělo dokumentu */}
            <article>
              {doc.intro && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 mb-8 border border-cyan-100">
                  <p className="text-gray-700 leading-relaxed">{renderInline(doc.intro, "intro")}</p>
                </div>
              )}

              {doc.sections.map((section) => (
                <section key={section.id} id={section.id} className="mb-10 scroll-mt-28">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    {section.title}
                  </h2>
                  {section.blocks.map((b, idx) => (
                    <Block key={`${section.id}-${idx}`} block={b} k={`${section.id}-${idx}`} />
                  ))}
                </section>
              ))}

              {/* Související dokumenty */}
              {doc.related && doc.related.length > 0 && (
                <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
                  <h3 className="font-semibold text-gray-900 mb-4">Související dokumenty</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {doc.related.map((r) => (
                      <Link key={r.href} href={r.href} className="text-cyan-600 hover:text-cyan-700 font-medium">
                        {r.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
