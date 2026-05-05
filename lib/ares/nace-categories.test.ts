import { describe, it, expect } from "vitest";
import {
  naceToSlugs,
  slugsToCategoryIds,
  naceToCategoryIds,
  type CategoryRef,
} from "./nace-categories";

describe("naceToSlugs — longest-prefix-wins lookup", () => {
  it("4-cif. NACE má přednost před 2-cif. prefixem", () => {
    // 4321 = elektrikar (specific) > 43 = stavebnictvi (general)
    expect(naceToSlugs(["4321"])).toEqual(["elektrikar"]);
  });

  it("4321 → elektrikar (Elektrické instalace)", () => {
    expect(naceToSlugs(["4321"])).toEqual(["elektrikar"]);
  });

  it("4322 → instalater (Voda + plyn)", () => {
    expect(naceToSlugs(["4322"])).toEqual(["instalater"]);
  });

  it("4332 → truhlar (Truhlářské + tesařské)", () => {
    expect(naceToSlugs(["4332"])).toEqual(["truhlar"]);
  });

  it("4391 → strechy (Pokrývačské)", () => {
    expect(naceToSlugs(["4391"])).toEqual(["strechy"]);
  });

  it("4520 → autoservis (Opravy mot. vozidel)", () => {
    expect(naceToSlugs(["4520"])).toEqual(["autoservis"]);
  });

  it("4942 → stehovani", () => {
    expect(naceToSlugs(["4942"])).toEqual(["stehovani"]);
  });

  it("8121 → uklid", () => {
    expect(naceToSlugs(["8121"])).toEqual(["uklid"]);
  });

  it("8130 → udrzba-zelene", () => {
    expect(naceToSlugs(["8130"])).toEqual(["udrzba-zelene"]);
  });

  it("9521 → oprava-spotrebicu", () => {
    expect(naceToSlugs(["9521"])).toEqual(["oprava-spotrebicu"]);
  });

  it("9523 → oprava-obuvi", () => {
    expect(naceToSlugs(["9523"])).toEqual(["oprava-obuvi"]);
  });

  it("9525 → hodinar", () => {
    expect(naceToSlugs(["9525"])).toEqual(["hodinar"]);
  });

  it("9601 → cisteni-kobercu (Praní)", () => {
    expect(naceToSlugs(["9601"])).toEqual(["cisteni-kobercu"]);
  });

  it("4120 → stavebnictvi (top-level fallback)", () => {
    expect(naceToSlugs(["4120"])).toEqual(["stavebnictvi"]);
  });

  it("dedupliuje opakované slugs", () => {
    // 4120 + 4312 → oba jsou stavebnictvi → 1× v outputu
    expect(naceToSlugs(["4120", "4312", "4313"])).toEqual(["stavebnictvi"]);
  });

  it("vrací více slugů pro různá NACE", () => {
    const slugs = naceToSlugs(["4321", "4322", "4332"]);
    expect(slugs).toContain("elektrikar");
    expect(slugs).toContain("instalater");
    expect(slugs).toContain("truhlar");
    expect(slugs).toHaveLength(3);
  });

  it("ignoruje nesmyslné kódy ('G', '00', 'M')", () => {
    expect(naceToSlugs(["G", "00", "M"])).toEqual([]);
  });

  it("empty input → empty output", () => {
    expect(naceToSlugs([])).toEqual([]);
  });

  it("null/undefined v poli ignoruje", () => {
    expect(naceToSlugs([null, undefined, "", "4120"])).toEqual(["stavebnictvi"]);
  });

  it("number input se převede na string", () => {
    expect(naceToSlugs([4120 as unknown as string])).toEqual(["stavebnictvi"]);
  });

  it("reálný ARES vzorek (úklidová firma)", () => {
    // Skutečný subjekt z naší DB: úklid + opravy + zahrada
    const naces = ["8121", "8129", "9522", "8130"];
    const slugs = naceToSlugs(naces);
    expect(slugs).toContain("uklid");
    expect(slugs).toContain("oprava-spotrebicu");
    expect(slugs).toContain("udrzba-zelene");
  });

  it("reálný ARES vzorek (stavební firma s víc obory)", () => {
    // 4120 obecné stavby, 4321 elektro, 4322 voda, 4332 truhlář, 4339 fasády
    const slugs = naceToSlugs(["4120", "4321", "4322", "4332", "4339"]);
    expect(slugs.sort()).toEqual(
      ["stavebnictvi", "elektrikar", "instalater", "truhlar", "cisteni-fasad"].sort(),
    );
  });

  it("reálný ARES vzorek (auto + doprava)", () => {
    const slugs = naceToSlugs(["4520", "4941", "4942", "4520"]);
    expect(slugs).toContain("autoservis");
    expect(slugs).toContain("doprava");
    expect(slugs).toContain("stehovani");
  });

  it("nesmysly ze sample dat (G, 00, 412, 4120) se zorientuje správně", () => {
    // Z reálného sample: má 412 (3-cif fallback) i 4120 (přesný match) → oba
    // mapují na stavebnictvi, deduplikuje se.
    expect(naceToSlugs(["G", "00", "412", "4120"])).toEqual(["stavebnictvi"]);
  });

  it("3-cif fallback funguje (256 → zamecnictvi)", () => {
    expect(naceToSlugs(["256"])).toEqual(["zamecnictvi"]);
  });

  it("2-cif fallback funguje pro IT (62 → it)", () => {
    expect(naceToSlugs(["62"])).toEqual(["it"]);
  });
});

describe("slugsToCategoryIds — přidává parent UUID", () => {
  const STAVEBNICTVI_ID = "61d49eb8-d118-4893-af88-ed0791a85428";
  const ELEKTRO_ID = "1af88993-9e20-4d57-8358-5c2c86a0ce1a";
  const ELEKTRIKAR_ID = "dd9345d5-14cf-4b6f-a42c-a2428684e77a";
  const INSTALATER_ID = "06247c9f-399c-43ae-80c8-ffff53031ead";
  const REMESLA_ID = "57c28ba5-39ea-4d11-94f0-12811c257137";
  const TRUHLAR_ID = "b0663314-cbd1-4486-ba3f-e7921e7f7a8b";

  const map: ReadonlyMap<string, CategoryRef> = new Map([
    ["stavebnictvi", { id: STAVEBNICTVI_ID, parent_id: null }],
    ["elektro-voda-topeni", { id: ELEKTRO_ID, parent_id: null }],
    ["elektrikar", { id: ELEKTRIKAR_ID, parent_id: ELEKTRO_ID }],
    ["instalater", { id: INSTALATER_ID, parent_id: ELEKTRO_ID }],
    ["remeslnici", { id: REMESLA_ID, parent_id: null }],
    ["truhlar", { id: TRUHLAR_ID, parent_id: REMESLA_ID }],
  ]);

  it("top-level slug → samotné UUID (žádný parent)", () => {
    expect(slugsToCategoryIds(["stavebnictvi"], map)).toEqual([STAVEBNICTVI_ID]);
  });

  it("subcategory slug → UUID + parent UUID", () => {
    const ids = slugsToCategoryIds(["elektrikar"], map);
    expect(ids.sort()).toEqual([ELEKTRIKAR_ID, ELEKTRO_ID].sort());
  });

  it("dvě subcategories pod stejným parentem → parent jen 1×", () => {
    const ids = slugsToCategoryIds(["elektrikar", "instalater"], map);
    expect(ids.sort()).toEqual([ELEKTRIKAR_ID, INSTALATER_ID, ELEKTRO_ID].sort());
  });

  it("neznámý slug se přeskočí", () => {
    expect(slugsToCategoryIds(["neznamy-slug", "stavebnictvi"], map)).toEqual([
      STAVEBNICTVI_ID,
    ]);
  });

  it("empty input → empty output", () => {
    expect(slugsToCategoryIds([], map)).toEqual([]);
  });

  it("subcategories z různých parentů → všechny UUIDs", () => {
    const ids = slugsToCategoryIds(["elektrikar", "truhlar"], map);
    expect(ids.sort()).toEqual(
      [ELEKTRIKAR_ID, ELEKTRO_ID, TRUHLAR_ID, REMESLA_ID].sort(),
    );
  });
});

describe("naceToCategoryIds — composition", () => {
  const STAVEBNICTVI_ID = "61d49eb8-d118-4893-af88-ed0791a85428";
  const ELEKTRO_ID = "1af88993-9e20-4d57-8358-5c2c86a0ce1a";
  const ELEKTRIKAR_ID = "dd9345d5-14cf-4b6f-a42c-a2428684e77a";

  const map: ReadonlyMap<string, CategoryRef> = new Map([
    ["stavebnictvi", { id: STAVEBNICTVI_ID, parent_id: null }],
    ["elektro-voda-topeni", { id: ELEKTRO_ID, parent_id: null }],
    ["elektrikar", { id: ELEKTRIKAR_ID, parent_id: ELEKTRO_ID }],
  ]);

  it("kombinuje obě fáze (NACE → slugs → IDs s parenty)", () => {
    const ids = naceToCategoryIds(["4120", "4321"], map);
    expect(ids.sort()).toEqual(
      [STAVEBNICTVI_ID, ELEKTRIKAR_ID, ELEKTRO_ID].sort(),
    );
  });

  it("empty NACE → empty IDs", () => {
    expect(naceToCategoryIds([], map)).toEqual([]);
  });

  it("NACE bez matche → empty", () => {
    expect(naceToCategoryIds(["G", "00"], map)).toEqual([]);
  });
});
