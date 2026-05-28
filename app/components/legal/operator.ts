/* Údaje o provozovateli — jediné místo pravdy pro všechny právní dokumenty.
 * POZN. K OVĚŘENÍ: e-maily sjednoceny na doménu fachmani.org (kanonická doména).
 * Pokud jsou produkční schránky stále na .cz, uprav zde. */
export const OPERATOR = {
  name: "Fachmani Network s.r.o.",
  ico: "24872849",
  // Ověřeno v ARES / registru plátců DPH 2026-05-28: subjekt NENÍ plátcem DPH,
  // nemá přiděleno DIČ. Ceny jsou tedy konečné, bez DPH.
  dic: null,
  isVatPayer: false,
  address: "Příčná 1892/4, 110 00 Praha 1 – Nové Město",
  registration:
    "zapsaná v obchodním rejstříku vedeném Městským soudem v Praze",
  email: "info@fachmani.org",
  emailGdpr: "gdpr@fachmani.org",
  emailDpo: "dpo@fachmani.org",
  emailLegal: "pravo@fachmani.org",
  phone: "+420 228 228 143",
  site: "www.fachmani.org",
  // Ověřeno v ARES 2026-05-28: registrovaná obchodní firma je „Comgate a.s."
  // (dříve „ComGate Payments, a.s."), IČO 27924505, sídlo Hradec Králové.
  paymentProvider: "Comgate a.s., IČO: 27924505",
  paymentProviderSeat:
    "Gočárova třída 1754/48b, Pražské Předměstí, 500 02 Hradec Králové",
} as const;

/** Jednořádkový identifikátor provozovatele pro použití v textu. */
export const OPERATOR_LINE = `${OPERATOR.name}, IČO: ${OPERATOR.ico}, se sídlem ${OPERATOR.address}, ${OPERATOR.registration} (dále jen „Provozovatel")`;
