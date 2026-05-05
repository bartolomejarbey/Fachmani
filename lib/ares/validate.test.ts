import { describe, it, expect } from "vitest";
import { isValidIco, normalizeIco } from "./validate";

describe("isValidIco — mod-11 checksum", () => {
  // Reálná/zkonstruovaná platná IČO (všechna splňují mod-11 podle CZ pravidla).
  const validIcos = [
    "27082440", // ČEZ
    "45193371", // ÚNMZ
    "00006947", // Magistrát hl. m. Prahy
    "61974757", // Komora daňových poradců
    "00023221", // Fakultní nemocnice Hradec Králové
    "29144302",
    "27074358", // Seznam.cz
    "25596641",
    "47114983",
    "26168685",
    "62157124",
    "00064581",
  ];

  const invalidIcos = [
    "",                 // prázdné
    "1234567",          // 7 znaků
    "123456789",        // 9 znaků
    "abcdefgh",         // ne-číslice
    "12345678",         // checksum neprojde
    "00000000",         // triviální, neprojde checksumem
    "27082441",         // změněná poslední číslice
    "99999999",         // vše 9, checksum neprojde
    "11111112",
    "87654321",
  ];

  for (const ico of validIcos) {
    it(`přijme platné IČO ${ico}`, () => {
      expect(isValidIco(ico)).toBe(true);
    });
  }

  for (const ico of invalidIcos) {
    it(`odmítne neplatné IČO "${ico}"`, () => {
      expect(isValidIco(ico)).toBe(false);
    });
  }

  it("akceptuje IČO s mezerami a oddělovači", () => {
    expect(isValidIco("270 82 440")).toBe(true);
    expect(isValidIco("27-082-440")).toBe(true);
  });

  it("null / undefined vrací false", () => {
    expect(isValidIco(undefined as unknown as string)).toBe(false);
    expect(isValidIco(null as unknown as string)).toBe(false);
  });
});

describe("normalizeIco", () => {
  it("doplní nuly zleva na 8 znaků", () => {
    expect(normalizeIco("123")).toBe("00000123");
    expect(normalizeIco("6947")).toBe("00006947");
  });

  it("odstraní ne-číselné znaky", () => {
    expect(normalizeIco("270-82-440")).toBe("27082440");
    expect(normalizeIco(" 27 082 440 ")).toBe("27082440");
  });

  it("ořízne zleva pokud je delší než 8 znaků", () => {
    expect(normalizeIco("1234567890")).toBe("34567890");
  });

  it("prázdný / null / undefined → 8 nul", () => {
    expect(normalizeIco("")).toBe("00000000");
    expect(normalizeIco(undefined as unknown as string)).toBe("00000000");
    expect(normalizeIco(null as unknown as string)).toBe("00000000");
  });
});
