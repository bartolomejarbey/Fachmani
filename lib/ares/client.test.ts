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
          seznamRegistraci: { stavZdrojeVr: "AKTIVNI" },
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
    expect(res.registrationStates.stavZdrojeVr).toBe("AKTIVNI");
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
      new Response(
        JSON.stringify({
          obchodniJmeno: "Bez sídla s.r.o.",
          seznamRegistraci: { stavZdrojeVr: "AKTIVNI" },
        }),
        { status: 200 }
      )
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("unreachable");
    expect(res.structuredAddress).toBeNull();
    expect(res.address).toBeNull();
  });

  it("vrátí inactive/deleted když ARES má datumZaniku", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          obchodniJmeno: "Zaniklá s.r.o.",
          datumVzniku: "2010-03-01",
          datumZaniku: "2024-05-01",
          seznamRegistraci: { stavZdrojeVr: "VYMAZANY" },
        }),
        { status: 200 }
      )
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("inactive");
    if (res.status !== "inactive") throw new Error("unreachable");
    expect(res.reason).toBe("deleted");
    expect(res.datumZaniku).toBe("2024-05-01");
    expect(res.name).toBe("Zaniklá s.r.o.");
  });

  it("vrátí inactive/never_active když všechny rejstříky != AKTIVNI", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          obchodniJmeno: "Vymazaná bez data zániku",
          seznamRegistraci: {
            stavZdrojeVr: "VYMAZANY",
            stavZdrojeRzp: "NEEXISTUJICI",
            stavZdrojeRes: "AKTIVNI", // RES nesmí stačit pro aktivitu
          },
        }),
        { status: 200 }
      )
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("inactive");
    if (res.status !== "inactive") throw new Error("unreachable");
    expect(res.reason).toBe("never_active");
    expect(res.datumZaniku).toBeNull();
  });

  it("vrátí ok když je aktivní jen v RZP (živnostenský)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          obchodniJmeno: "OSVČ řemeslník",
          datumVzniku: "2018-06-01",
          seznamRegistraci: {
            stavZdrojeVr: "NEEXISTUJICI",
            stavZdrojeRzp: "AKTIVNI",
          },
        }),
        { status: 200 }
      )
    );
    const res = await lookupAres("27082440");
    expect(res.status).toBe("ok");
    if (res.status !== "ok") throw new Error("unreachable");
    expect(res.datumVzniku).toBe("2018-06-01");
    expect(res.datumZaniku).toBeNull();
    expect(res.registrationStates.stavZdrojeRzp).toBe("AKTIVNI");
  });
});
