"use client";

import React from "react";
import Link from "next/link";

export default function KontaktPage() {
  return (
    <section style={{ padding: "10rem 1.5rem 5rem", textAlign: "center", minHeight: "60vh" }}>
      <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: "3rem", letterSpacing: "-0.03em", marginBottom: "1rem" }}>
          Kontakt
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "1.125rem", marginBottom: "2rem" }}>
          Kontaktní stránka bude brzy doplněna.
        </p>
        <Link href="/" style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>
          Zpět na hlavní stránku
        </Link>
      </div>
    </section>
  );
}
