import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import SearchBar from "@/app/components/SearchBar";
import SearchResults from "./SearchResults";
import { isValidQuery, normalizeQuery, sanitizeForWebsearch } from "@/lib/search/query";

export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; typ?: string }>;

export const metadata: Metadata = {
  title: "Vyhledávání | Fachmani",
  description: "Prohledejte fachmany, kategorie a lokality na Fachmani.",
  robots: { index: false, follow: true },
};

type Result = {
  entity_type: "provider" | "seed_provider" | "category" | "demand" | "offer";
  entity_id: string;
  title: string;
  snippet: string;
  image_url: string | null;
  location: string | null;
  boost_verified: boolean;
  tier: string;
  rank: number;
};

export default async function Hledat({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q || "").slice(0, 200);
  const typ = sp.typ;
  const typeFilter =
    typ === "provider_any" ||
    typ === "provider" ||
    typ === "seed_provider" ||
    typ === "category" ||
    typ === "demand" ||
    typ === "offer"
      ? typ
      : null;

  let results: Result[] = [];
  let error: string | null = null;
  const valid = isValidQuery(q);

  if (valid) {
    const supabase = await createSupabaseServer();
    const { data, error: rpcError } = await supabase.rpc("search_entities", {
      p_query: sanitizeForWebsearch(q),
      p_query_norm: normalizeQuery(q),
      p_entity_filter: typeFilter,
      p_limit: 30,
    });
    if (rpcError) {
      error = "Vyhledávání dočasně nedostupné.";
    } else {
      results = (data as Result[] | null) || [];
    }

    // Best-effort logování z SSR (nezdrží response, protože už je dotaz hotový).
    void supabase.rpc("log_search_query", {
      p_query: q,
      p_query_norm: normalizeQuery(q),
      p_ip_hash: null,
      p_result_count: results.length,
    });
  }

  const countsByType: Record<string, number> = {
    provider: 0,
    seed_provider: 0,
    category: 0,
    demand: 0,
    offer: 0,
  };
  for (const r of results) countsByType[r.entity_type] = (countsByType[r.entity_type] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-32 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Vyhledávání</h1>
          <SearchBar initialQuery={q} autoFocus={!q} />
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {!valid ? (
            <p className="text-gray-500">Zadejte alespoň 2 znaky pro spuštění vyhledávání.</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
                <span className="text-gray-600">
                  {results.length} výsledků pro „<strong>{q}</strong>"
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      { key: null, label: "Vše" },
                      { key: "provider_any", label: `Fachmani (${countsByType.provider + countsByType.seed_provider})` },
                      { key: "category", label: `Kategorie (${countsByType.category})` },
                      { key: "demand", label: `Poptávky (${countsByType.demand})` },
                      { key: "offer", label: `Nabídky (${countsByType.offer})` },
                    ] as { key: string | null; label: string }[]
                  ).map((f) => {
                    const url = `/hledat?q=${encodeURIComponent(q)}${f.key ? `&typ=${f.key}` : ""}`;
                    const active = (f.key || null) === typeFilter || (!f.key && !typeFilter);
                    return (
                      <Link
                        key={f.label}
                        href={url}
                        className={`px-3 py-1 rounded-full ${
                          active ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <SearchResults query={q} results={results} />
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
