import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import LeadWizard from "@/app/components/landing/LeadWizard";

export type WatchPoint = { icon: string; title: string; desc: string };

export type LandingConfig = {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  heroEmoji: string;
  source: string;
  preCategoryId?: string;
  preCategoryName?: string;
  watchHeading: string;
  watchIntro: string;
  watchPoints: WatchPoint[];
};

const REASONS = [
  { t: "Jedna poptávka stačí", d: "Žádné obvolávání. Zadáte jednou, ozvou se vám oni." },
  { t: "Ověření profíci", d: "Identitu i reference prověřujeme. Žádní fušeři." },
  { t: "Nabídky do 7 dnů", d: "Reakce do týdne, expresně do 2 dnů. Žádné čekání." },
  { t: "Reálná hodnocení", d: "Vybíráte podle profilů, recenzí a cen." },
  { t: "Komunikace na místě", d: "S fachmanem se domluvíte napřímo, bez prostředníků." },
  { t: "Teď 100 % zdarma", d: "Zadání nic nestojí a k ničemu vás nezavazuje." },
];

export default function CampaignLanding({ config }: { config: LandingConfig }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO — agresivní, tmavý, s wizardem above the fold */}
      <section className="relative overflow-hidden bg-slate-900 pt-28 pb-20 sm:pt-32">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-24 h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-cyan-500/25 to-blue-600/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-blue-500/20 to-cyan-400/10 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          {/* Text */}
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {config.eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {config.titleLead}{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{config.titleAccent}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/70">{config.subtitle}</p>

            {/* urgency / risk-reduction badges */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {["⚡ Nabídky do 7 dnů", "✅ Ověření profíci", "🎁 100 % zdarma", "🔓 Nezávazně"].map((b) => (
                <span key={b} className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/10">
                  {b}
                </span>
              ))}
            </div>

            {/* mini social proof */}
            <div className="mt-8 flex items-center gap-6 text-white/60">
              <div>
                <p className="text-2xl font-extrabold text-white">do 2 dnů</p>
                <p className="text-xs">expresní reakce</p>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div>
                <p className="text-2xl font-extrabold text-white">0 Kč</p>
                <p className="text-xs">za zadání poptávky</p>
              </div>
            </div>
          </div>

          {/* Wizard card */}
          <div className="lg:pl-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <span className="text-lg">{config.heroEmoji}</span> Zadejte poptávku — zabere to minutu
            </div>
            <LeadWizard source={config.source} preCategoryId={config.preCategoryId} preCategoryName={config.preCategoryName} />
            <p className="mt-3 text-center text-xs text-white/40">🔒 Vaše údaje jsou v bezpečí. Žádný spam.</p>
          </div>
        </div>
      </section>

      {/* NA CO SI DÁT POZOR — substance kampaně */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{config.watchHeading}</h2>
            <p className="mt-3 text-gray-600">{config.watchIntro}</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {config.watchPoints.map((p, i) => (
              <div key={p.title} className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg">
                <span className="absolute right-5 top-5 text-sm font-extrabold tabular-nums text-gray-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-2xl transition-colors group-hover:bg-cyan-100">{p.icon}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROČ FACHMANI — číslované (01/06), agresivní */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-slate-900 sm:text-4xl">Proč přes Fachmani</h2>
          <p className="mt-3 text-center text-gray-600">Šest důvodů, proč to nedělat po staru.</p>
          <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {REASONS.map((r, i) => (
              <div key={r.t} className="flex gap-4 border-b border-gray-200 pb-6">
                <span className="text-lg font-extrabold tabular-nums text-cyan-500">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-bold text-slate-900">{r.t}</h3>
                  <p className="mt-1 text-sm text-gray-600">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
