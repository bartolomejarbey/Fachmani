import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { OPERATOR } from "@/app/components/legal/operator";

export const metadata: Metadata = {
  title: "Právní dokumenty | Fachmani",
  description:
    "Přehled všech právních dokumentů platformy Fachmani — obchodní podmínky, ochrana osobních údajů, cookies, DPA, reklamační řád, pravidla recenzí a obsahu, informace pro spotřebitele.",
  alternates: { canonical: "/pravni" },
};

type DocLink = {
  href: string;
  title: string;
  description: string;
  badge?: string;
};

const groups: { heading: string; docs: DocLink[] }[] = [
  {
    heading: "Smluvní podmínky",
    docs: [
      {
        href: "/vop",
        title: "Všeobecné obchodní podmínky",
        description:
          "Pravidla užívání platformy, povaha zprostředkování, registrace, placené služby, peněženka a práva spotřebitele.",
        badge: "VOP",
      },
      {
        href: "/spotrebitel",
        title: "Informace pro spotřebitele",
        description:
          "Předsmluvní informace, právo odstoupit od smlouvy do 14 dnů, vzorový formulář a mimosoudní řešení sporů.",
      },
      {
        href: "/reklamace",
        title: "Reklamační řád",
        description:
          "Postup pro uplatnění práv z vadného plnění u placených (digitálních) služeb platformy.",
      },
    ],
  },
  {
    heading: "Ochrana osobních údajů",
    docs: [
      {
        href: "/gdpr",
        title: "Zásady ochrany osobních údajů",
        description:
          "Jaké údaje zpracováváme, za jakým účelem a na jakém právním základě, vaše práva a seznam zpracovatelů.",
        badge: "GDPR",
      },
      {
        href: "/dpa",
        title: "Zpracování osobních údajů a DPA",
        description:
          "Smluvní rámec zpracování, seznam subzpracovatelů a vztah mezi provozovatelem a fachmanem ohledně údajů zákazníků.",
      },
      {
        href: "/cookies",
        title: "Zásady používání cookies",
        description:
          "Jaké soubory cookies a obdobné technologie používáme a jak můžete spravovat své předvolby.",
      },
    ],
  },
  {
    heading: "Obsah a komunita",
    docs: [
      {
        href: "/pravidla-recenzi",
        title: "Pravidla recenzí a hodnocení",
        description:
          "Jak recenze vznikají, jak ověřujeme jejich pravost a jaká pravidla pro hodnocení platí.",
      },
      {
        href: "/pravidla-obsahu",
        title: "Pravidla obsahu a moderace (DSA)",
        description:
          "Přípustný obsah, postup oznamování nezákonného obsahu (notice & action) a moderace dle nařízení o digitálních službách.",
        badge: "DSA",
      },
    ],
  },
];

export default function PravniPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50" />
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            PRÁVNÍ CENTRUM
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Právní dokumenty</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Přehled všech podmínek, zásad a pravidel platformy Fachmani. Dokumenty jsou navzájem
            provázané — odkazy najdete i v patičce každého z nich.
          </p>
        </div>
      </section>

      {/* Skupiny dokumentů */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          {groups.map((group) => (
            <div key={group.heading}>
              <h2 className="text-xl font-bold text-gray-900 mb-5 pb-2 border-b border-gray-100">
                {group.heading}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.docs.map((d) => (
                  <Link
                    key={d.href}
                    href={d.href}
                    className="group block rounded-2xl border border-gray-200 p-5 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {d.badge && (
                      <span className="inline-block bg-cyan-50 text-cyan-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                        {d.badge}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors">
                      {d.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{d.description}</p>
                    <span className="inline-block mt-3 text-sm font-medium text-cyan-600">
                      Otevřít →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Provozovatel */}
          <div className="rounded-2xl bg-gray-50 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Provozovatel</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {OPERATOR.name}, IČO: {OPERATOR.ico}, se sídlem {OPERATOR.address},{" "}
              {OPERATOR.registration}. Kontakt:{" "}
              <a
                href={`mailto:${OPERATOR.email}`}
                className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2"
              >
                {OPERATOR.email}
              </a>
              , tel. {OPERATOR.phone}. Provozovatel platebních služeb: {OPERATOR.paymentProvider}.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
