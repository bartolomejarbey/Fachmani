"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { iconAsTextPrefix } from "@/app/components/CategoryIcon";

type Category = { id: string; name: string; icon: string; parent_id: string | null };
type Region = { id: string; code: string; name_cs: string };
type District = { id: string; code: string; name_cs: string; region_id: string };

type Props = {
  categories: Category[];
  regions: Region[];
  districts: District[];
  selectedMain: string;
  selectedSub: string;
  selectedRegion: string;
  selectedDistrict: string;
  verifiedOnly: boolean;
  searchText: string;
};

export default function FachmaniFilters(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Lokální copy pro inputy — search debounce + okamžitý feedback bez čekání na router.
  const [search, setSearch] = useState(props.searchText);

  const mainCats = props.categories.filter((c) => c.parent_id === null);
  const subsOfSelectedMain = props.selectedMain
    ? props.categories.filter((c) => c.parent_id === props.selectedMain)
    : [];
  const districtsInRegion = props.selectedRegion
    ? props.districts.filter((d) => d.region_id === props.selectedRegion)
    : [];

  function pushParams(updater: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    updater(params);
    // Reset stránky při každé změně filtru — jiný výsledek = chce začít od první stránky.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/fachmani?${qs}` : "/fachmani", { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    pushParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
    });
  }

  function onMainChange(value: string) {
    pushParams((p) => {
      if (value) p.set("kategorie", value);
      else p.delete("kategorie");
    });
  }

  function onSubChange(value: string) {
    // Sub kategorie přepisuje hlavní v URL — při zvolení sub posíláme sub ID,
    // při zrušení sub vracíme se na uloženou hlavní.
    pushParams((p) => {
      if (value) p.set("kategorie", value);
      else if (props.selectedMain) p.set("kategorie", props.selectedMain);
      else p.delete("kategorie");
    });
  }

  function onRegionChange(value: string) {
    pushParams((p) => {
      if (value) p.set("kraj", value);
      else p.delete("kraj");
      // Zrušení kraje shodí i okres.
      p.delete("okres");
    });
  }

  function onDistrictChange(value: string) {
    setParam("okres", value);
  }

  function onVerifiedChange(checked: boolean) {
    setParam("overeni", checked ? "1" : "");
  }

  function onResetAll() {
    setSearch("");
    startTransition(() => router.push("/fachmani", { scroll: false }));
  }

  // Debounce search → URL update (300 ms)
  useEffect(() => {
    if (search === props.searchText) return;
    const t = setTimeout(() => {
      setParam("q", search.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 ${isPending ? "opacity-70" : ""} transition-opacity`}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Hledat (jméno nebo město)</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="např. Novák, Brno, Praha 5…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hlavní kategorie</label>
          <select
            value={props.selectedMain}
            onChange={(e) => onMainChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Všechny kategorie</option>
            {mainCats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {iconAsTextPrefix(cat.icon)}{cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Podkategorie</label>
          <select
            value={props.selectedSub}
            onChange={(e) => onSubChange(e.target.value)}
            disabled={!props.selectedMain || subsOfSelectedMain.length === 0}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Všechny podkategorie</option>
            {subsOfSelectedMain.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {iconAsTextPrefix(cat.icon)}{cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kraj</label>
          <select
            value={props.selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Všechny kraje</option>
            {props.regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name_cs}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Okres</label>
          <select
            value={props.selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            disabled={!props.selectedRegion}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Všechny okresy</option>
            {districtsInRegion.map((d) => (
              <option key={d.id} value={d.id}>{d.name_cs}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors w-full">
            <input
              type="checkbox"
              checked={props.verifiedOnly}
              onChange={(e) => onVerifiedChange(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded-lg border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-gray-700 font-medium">Pouze ověření</span>
          </label>
        </div>

        <div className="flex items-end">
          <button
            onClick={onResetAll}
            className="w-full px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Zrušit filtry
          </button>
        </div>
      </div>
    </div>
  );
}
