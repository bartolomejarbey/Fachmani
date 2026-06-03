import type { Metadata } from "next";
import LegalDocument, { type LegalDoc } from "@/app/components/legal/LegalDocument";
import doc from "./vop-doc.json";

export const metadata: Metadata = {
  title: "Všeobecné obchodní podmínky | Fachmani",
  description:
    "Úplné všeobecné obchodní podmínky platformy Fachmani — práva a povinnosti zákazníků a fachmanů, povaha zprostředkování, registrace a ověření, placené služby, peněženka a kredity, předplatné, platby přes Comgate, obsah a recenze, DSA, ochrana osobních údajů, odpovědnost, odstoupení od smlouvy a mimosoudní řešení sporů.",
  alternates: { canonical: "/vop" },
};

// Obsah VOP (verze 3.0) je generován do app/vop/vop-doc.json a renderován sdílenou
// komponentou LegalDocument. Identifikační údaje odpovídají app/components/legal/operator.ts.
export default function VOPPage() {
  return <LegalDocument doc={doc as unknown as LegalDoc} />;
}
