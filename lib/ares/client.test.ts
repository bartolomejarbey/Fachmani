import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { lookupAres } from "./client";

const REAL_FETCH = globalThis.fetch;

describe("lookupAres — odpověď ARES", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = REAL_FETCH;
  });

  it("vrátí strukturovanou adresu když ARES vrátí sidlo", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          obchodniJmeno: "Acme Test s.r.o.",
          pravniForma: "112",
          dic: "CZ27082440",
          sidlo: {
            nazevUlice: "Dlouhá",
            cisloDomovni: 12,
            cisloOrientacni: 3,
            nazevObce: "Praha",
            psc: 11000,
            nazevStatu: "Česká republika",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await lookupAres("27082440");
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("unreachable");
    expect(res.name).toBe("Acme Test s.r.o.");
    expect(res.dic).toBe("CZ27082440");
    expect(res.address).toBe("Dlouhá 12/3, 11000 Praha");
    expect(res.structuredAddress).toEqual({
      street: "Dlouhá",
      house_number: "12",
      orientation_number: "3",
      city: "Praha",
      postal_code: "11000",
      country: "Česká republika",
    });
  });

  it("vrátí not_found pro HTTP 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const res = await lookupAres("27082440");
    expect(res.status).toBe("not_found");
  });

  it("vrátí error pro neplatné IČO", async () => {
    const res = await lookupAres("12345678"); // neplatný checksum
    expect(res.status).toBe("error");
  });

  it("vrátí not_found když obchodniJmeno chybí", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sidlo: { nazevObce: "Praha" } }), { status: 200 })
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("not_found");
  });

  it("retry-uje při HTTP 500 a ukončí po 4 pokusech", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    globalThis.fetch = fetchMock;
    const res = await lookupAres("27082440");
    expect(res.status).toBe("error");
    // MAX_RETRIES=3 → 0,1,2,3 = 4 iterace
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10000);

  it("strukturovaná adresa null když sidlo nemá relevantní pole", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ obchodniJmeno: "Bez sídla s.r.o." }), { status: 200 })
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("unreachable");
    expect(res.structuredAddress).toBeNull();
    expect(res.address).toBeNull();
  });
});
