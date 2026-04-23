"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Region, District } from "@/app/types/location";

type Props = {
  regionId: string | null;
  districtId: string | null;
  onChange: (next: { regionId: string | null; districtId: string | null }) => void;
  labelClassName?: string;
  selectClassName?: string;
  disabled?: boolean;
};

export default function LocationSelect({
  regionId,
  districtId,
  onChange,
  labelClassName = "block text-sm font-semibold text-gray-700 mb-2",
  selectClassName = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all bg-white",
  disabled = false,
}: Props) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: regionsData }, { data: districtsData }] = await Promise.all([
        supabase.from("regions").select("id, code, name_cs, sort_order").order("sort_order"),
        supabase.from("districts").select("id, region_id, code, name_cs, sort_order").order("name_cs"),
      ]);
      if (cancelled) return;
      setRegions(regionsData ?? []);
      setDistricts(districtsData ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDistricts = useMemo(
    () => (regionId ? districts.filter((d) => d.region_id === regionId) : []),
    [districts, regionId]
  );

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value || null;
    onChange({ regionId: next, districtId: null });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ regionId, districtId: e.target.value || null });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className={labelClassName}>Kraj</label>
        <select
          value={regionId ?? ""}
          onChange={handleRegionChange}
          disabled={disabled || loading}
          className={selectClassName}
        >
          <option value="">— Vyberte kraj —</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name_cs}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName}>Okres</label>
        <select
          value={districtId ?? ""}
          onChange={handleDistrictChange}
          disabled={disabled || loading || !regionId}
          className={selectClassName}
        >
          <option value="">
            {regionId ? "— Vyberte okres —" : "— Nejprve vyberte kraj —"}
          </option>
          {filteredDistricts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_cs}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
