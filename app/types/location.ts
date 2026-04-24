export type Region = {
  id: string;
  code: string;
  name_cs: string;
  sort_order: number;
};

export type District = {
  id: string;
  region_id: string;
  code: string;
  name_cs: string;
  sort_order: number;
};

export function formatLocation(
  regionName: string | null | undefined,
  districtName: string | null | undefined
): string | null {
  if (districtName && regionName) return `${districtName}, ${regionName}`;
  if (regionName) return regionName;
  return null;
}
