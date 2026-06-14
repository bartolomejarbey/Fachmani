"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { isIOSNative } from "@/lib/native";
import ImageCropper from "@/app/components/ImageCropper";
import { iconAsTextPrefix } from "@/app/components/CategoryIcon";
import SuccessCelebration from "@/app/components/SuccessCelebration";

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  sort_order: number | null;
};

function NovaPoptavkaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ghostIco = searchParams.get("ghostIco");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [expiryDays, setExpiryDays] = useState(30); // Default
  const [urgentPrice, setUrgentPrice] = useState(100);
  const [extraRequestPrice, setExtraRequestPrice] = useState(50);
  const [ghostName, setGhostName] = useState<string | null>(null);
  // Customer quota: daily request limit + paid extras + monthly free urgent
  const [quota, setQuota] = useState<{
    dailyUsed: number;
    dailyLimit: number;
    dailyExtras: number;
    urgentUsed: number;
    urgentFreeLimit: number;
    isPremium: boolean;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  // App Store: na iOS žádné navádění k nákupu / ceny (3.1.1).
  const [isIos, setIsIos] = useState(false);
  useEffect(() => setIsIos(isIOSNative()), []);

  const [title, setTitle] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Oslavná animace po úspěšném odeslání + cílová URL detailu poptávky.
  const [celebrating, setCelebrating] = useState(false);
  const successUrl = useRef<string>("");
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // „Připravenost poptávky" — ZÁMĚRNĚ jen needěná pole (název/kategorie/popis/lokalita
  // + bonus za fotku/termín). NIKDY rozpočet/priorita → gamifikace nikdy nevytahuje ceny (iOS 3.1.1).
  const pct = useMemo(() => {
    const core =
      [title.trim().length > 0, !!mainCategoryId, description.trim().length >= 15, location.trim().length > 0].filter(
        Boolean,
      ).length;
    const bonus = (imageFiles.length > 0 ? 1 : 0) + (preferredDate ? 1 : 0);
    return Math.min(100, core * 20 + bonus * 10);
  }, [title, mainCategoryId, description, location, imageFiles.length, preferredDate]);
  const progressLabel =
    pct === 100 ? "Připraveno odeslat ✅" : pct >= 70 ? "Skoro hotovo 🔥" : pct >= 30 ? "Skvělé, pokračujte!" : "Začínáme!";

  useEffect(() => {
    async function loadData() {
      // Načteme pouze aktivní kategorie
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, icon, parent_id, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Načteme platform + pricing nastavení (paralelně)
      const [{ data: platformData }, { data: pricingData }] = await Promise.all([
        supabase.from("system_settings").select("value").eq("key", "platform_settings").single(),
        supabase.from("system_settings").select("value").eq("key", "pricing").single(),
      ]);

      if (platformData?.value?.request_expiry_days) {
        setExpiryDays(platformData.value.request_expiry_days);
      }
      if (typeof pricingData?.value?.urgent_request === "number") {
        setUrgentPrice(pricingData.value.urgent_request);
      }
      if (typeof pricingData?.value?.extra_request === "number") {
        setExtraRequestPrice(pricingData.value.extra_request);
      }

      // Customer quota
      const dailyLimit = typeof platformData?.value?.free_requests_per_day === "number"
        ? platformData.value.free_requests_per_day
        : 1;
      const urgentFreeLimit = typeof platformData?.value?.urgent_free_per_month === "number"
        ? platformData.value.urgent_free_per_month
        : 1;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: prof }, { data: wallet }] = await Promise.all([
          supabase
            .from("profiles")
            .select("subscription_type, daily_request_count, daily_request_reset_at, daily_request_extras, monthly_urgent_count, monthly_urgent_reset_at")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("wallets")
            .select("balance_kc")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (prof) {
          const isPremium = prof.subscription_type === "premium" || prof.subscription_type === "business";
          // Reset denně (server trigger udělá real reset, klient jen hint)
          const resetAt = prof.daily_request_reset_at ? new Date(prof.daily_request_reset_at) : new Date();
          const todayUtc = new Date(); todayUtc.setUTCHours(0, 0, 0, 0);
          const dailyUsed = resetAt < todayUtc ? 0 : (prof.daily_request_count ?? 0);
          const dailyExtras = resetAt < todayUtc ? 0 : (prof.daily_request_extras ?? 0);
          // Reset měsíčního urgentu (>30d)
          const urgentResetAt = prof.monthly_urgent_reset_at ? new Date(prof.monthly_urgent_reset_at) : new Date();
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const urgentUsed = urgentResetAt < monthAgo ? 0 : (prof.monthly_urgent_count ?? 0);
          setQuota({ dailyUsed, dailyLimit, dailyExtras, urgentUsed, urgentFreeLimit, isPremium });
        }
        setWalletBalance(wallet?.balance_kc ?? 0);
      }

      if (ghostIco && /^[0-9]{8}$/.test(ghostIco)) {
        const { data: g } = await supabase
          .from("ghost_subjects")
          .select("name")
          .eq("ico", ghostIco)
          .maybeSingle();
        if (g?.name) setGhostName(g.name);
      }

      // Předvyplnění z odkazu (např. z AI asistenta) — uživatel jen zkontroluje a odešle.
      const pTitle = searchParams.get("title");
      const pDesc = searchParams.get("description");
      const pLoc = searchParams.get("lokalita");
      const pBudgetMin = searchParams.get("budgetMin");
      const pBudgetMax = searchParams.get("budgetMax");
      const pUrgent = searchParams.get("urgent");
      const pKat = searchParams.get("kategorie");
      if (pTitle) setTitle(pTitle.slice(0, 200));
      if (pDesc) setDescription(pDesc.slice(0, 2000));
      if (pLoc) setLocation(pLoc.slice(0, 120));
      if (pBudgetMin && /^\d+$/.test(pBudgetMin)) setBudgetMin(pBudgetMin);
      if (pBudgetMax && /^\d+$/.test(pBudgetMax)) setBudgetMax(pBudgetMax);
      if (pUrgent === "1" || pUrgent === "true") setIsUrgent(true);
      if (pKat && categoriesData) {
        const norm = (s: string) =>
          s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        const target = norm(pKat);
        const sub = categoriesData.find(
          (c) => c.parent_id && norm(c.name) === target
        );
        const main = categoriesData.find(
          (c) => !c.parent_id && norm(c.name) === target
        );
        if (sub) {
          setMainCategoryId(sub.parent_id as string);
          setCategoryId(sub.id);
        } else if (main) {
          setMainCategoryId(main.id);
        }
      }

      setPageLoading(false);
    }

    loadData();
  }, [ghostIco]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      setError("Maximálně 5 fotek.");
      return;
    }
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Soubor "${file.name}" není povolený. Použijte JPG, PNG nebo WebP.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`Soubor "${file.name}" je větší než 5 MB.`);
        return;
      }
    }
    // Open cropper for first file
    if (files.length > 0) {
      setPendingFile(files[0]);
      const reader = new FileReader();
      reader.onload = (ev) => setCropSource(ev.target?.result as string);
      reader.readAsDataURL(files[0]);
    }
    // Reset input so same file can be re-selected
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
    const preview = URL.createObjectURL(blob);
    setImageFiles((prev) => [...prev, { file, preview }]);
    setCropSource(null);
    setPendingFile(null);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (budgetMin && (parseInt(budgetMin) < 0 || parseInt(budgetMin) > 5000000)) {
      setError("Rozpočet musí být 0–5 000 000 Kč.");
      setLoading(false);
      return;
    }
    if (budgetMax && (parseInt(budgetMax) < 0 || parseInt(budgetMax) > 5000000)) {
      setError("Rozpočet musí být 0–5 000 000 Kč.");
      setLoading(false);
      return;
    }
    if (budgetMin && budgetMax && parseInt(budgetMin) > parseInt(budgetMax)) {
      setError("Rozpočet od nemůže být větší než rozpočet do.");
      setLoading(false);
      return;
    }
    if (preferredDate && new Date(preferredDate) < new Date(new Date().toDateString())) {
      setError("Preferovaný termín nemůže být v minulosti.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?redirect=/nova-poptavka");
      return;
    }

    // A.F1 — AI moderace title + description před insertem
    try {
      const modRes = await fetch("/api/moderation/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${title}\n\n${description}`, kind: "request" }),
      });
      if (modRes.ok) {
        const mod = await modRes.json();
        if (mod.flagged) {
          setError(
            "Vaše poptávka obsahuje obsah, který nelze publikovat (urážlivé výrazy, nezákonný obsah apod.). " +
            "Upravte text a zkuste to znovu. Pokud máte za to, že jde o omyl, kontaktujte podporu."
          );
          setLoading(false);
          return;
        }
      }
      // fail-open při chybě API — backend stejně udělá moderation v admin frontě
    } catch {
      // network error — fail open
    }

    // Upload images
    const imageUrls: string[] = [];
    for (const img of imageFiles) {
      const ext = img.file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("demand-images")
        .upload(fileName, img.file);
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("demand-images")
          .getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }
    }

    // Pokud free zákazník vyčerpal denní kvótu a nemá zaplacený extra slot,
    // pre-charge 50 Kč z peněženky — wallet API zavolá grant_extra_request RPC,
    // takže následný insert už trigger pustí.
    const needsPaidExtra =
      !!quota &&
      !quota.isPremium &&
      quota.dailyUsed >= quota.dailyLimit &&
      quota.dailyExtras === 0;

    if (needsPaidExtra) {
      // App Store 3.1.1: na iOS neúčtujeme placené extra poptávky (in-app měna) ani nenavádíme na peněženku.
      if (isIOSNative()) {
        setError("Dosáhli jste denního limitu bezplatných poptávek. Další poptávku můžete zadat zítra.");
        setLoading(false);
        return;
      }
      try {
        const spendRes = await fetch("/api/wallet/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "extra_request" }),
        });
        if (!spendRes.ok) {
          if (spendRes.status === 402) {
            const j = await spendRes.json().catch(() => ({}));
            setError(
              `Vyčerpali jste denní kvótu. Pro extra poptávku potřebujete ${extraRequestPrice} Kč v peněžence (chybí ${j.shortfall ?? extraRequestPrice} Kč). Dobijte si peněženku v Předplatné.`
            );
          } else {
            setError("Platba za extra poptávku selhala. Zkuste to znovu nebo aktivujte Premium.");
          }
          setLoading(false);
          return;
        }
      } catch {
        setError("Platba za extra poptávku selhala (síťová chyba). Zkuste to znovu.");
        setLoading(false);
        return;
      }
    }

    // Vypočítáme datum expirace podle nastavení
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data, error: insertError } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        category_id: categoryId || null,
        title,
        description,
        location,
        postal_code: postalCode || null,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_date: preferredDate || null,
        status: "active",
        expires_at: expiresAt.toISOString(),
        images: imageUrls.length > 0 ? imageUrls : [],
      })
      .select()
      .single();

    if (insertError) {
      // Trigger vyhodí "Vyčerpali jste denní limit..." s ERRCODE 23514
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Optimistic increment denní kvóty (server trigger reálně inkrementuje)
    if (quota && !quota.isPremium) {
      setQuota({ ...quota, dailyUsed: quota.dailyUsed + 1 });
    }

    // Prioritní poptávka.
    // Pravidlo: urgent_free_per_month/měsíc je zdarma. Dál urgentPrice (100 Kč) z peněženky.
    if (isUrgent) {
      const urgentIsFree = !!quota && !quota.isPremium && quota.urgentUsed < quota.urgentFreeLimit;
      if (urgentIsFree || (quota && quota.isPremium)) {
        // Free urgent (free user v rámci měsíční kvóty NEBO premium/business)
        await supabase
          .from("requests")
          .update({ is_urgent: true, urgent_paid_at: new Date().toISOString() })
          .eq("id", data.id);
        // Záznam pro free zákazníka, aby další urgent stál peníze
        if (urgentIsFree) {
          void supabase.rpc("record_urgent_request", { p_user_id: user.id });
        }
      } else if (isIOSNative()) {
        // App Store 3.1.1: na iOS neúčtujeme prioritu z peněženky — poptávka zůstane
        // standardní (bez priority), bez jakékoli zmínky o ceně.
      } else {
        try {
          const spendRes = await fetch("/api/wallet/spend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "urgent_request", relatedEntityId: data.id }),
          });
          if (spendRes.ok) {
            await supabase
              .from("requests")
              .update({ is_urgent: true, urgent_paid_at: new Date().toISOString() })
              .eq("id", data.id);
            void supabase.rpc("record_urgent_request", { p_user_id: user.id });
          } else if (spendRes.status === 402) {
            alert(
              `Poptávka byla uložena, ale neměli jste dost kreditu na prioritu (${urgentPrice} Kč). Dobijte si peněženku a poté kontaktujte podporu pro aktivaci priority.`,
            );
          }
        } catch {
          // Wallet API nedostupné — degraduje na standardní poptávku.
        }
      }
    }

    // Pokud poptávka míří na ghost subjekt, založíme i ghost_lead pro admin tým.
    if (ghostIco && /^[0-9]{8}$/.test(ghostIco)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();
      await supabase.from("ghost_leads").insert({
        ghost_ico: ghostIco,
        request_id: data.id,
        customer_id: user.id,
        customer_name: profile?.full_name ?? null,
        customer_phone: profile?.phone ?? null,
        customer_email: profile?.email ?? null,
        message: `${title}\n\n${description}`.slice(0, 4000),
        status: "new",
      });
    }

    // WOW: oslavná animace + konfety, pak teprve redirect na detail.
    const dest = `/poptavka/${data.id}`;
    successUrl.current = dest;
    router.prefetch(dest);
    setCelebrating(true);
    setTimeout(() => router.push(dest), prefersReducedMotion.current ? 600 : 2400);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      {/* Aurora pozadí (dekorativní, levné — 2 blobs, fixed) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="np-aurora-a absolute -left-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-400/20 blur-3xl" />
        <div className="np-aurora-b absolute -right-28 bottom-0 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-blue-300/25 to-cyan-400/20 blur-3xl" />
      </div>

      <Navbar />

      {/* Sticky Mission HUD — „Připravenost poptávky" */}
      <div className="sticky top-16 z-30 -mx-0 bg-gray-50/80 px-4 pb-2 pt-24 backdrop-blur-md">
        <div className="np-card-in mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-cyan-100 bg-white/90 px-4 py-3 shadow-sm sm:gap-4">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-xl text-white shadow-md ${
              pct === 100 ? "np-badge-pop" : ""
            }`}
          >
            {pct === 100 ? "🚀" : "🛠️"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Připravenost poptávky
              </span>
              <span className="ml-2 text-sm font-bold tabular-nums text-gray-900">{pct}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Připravenost poptávky"
            >
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              >
                {pct < 100 && (
                  <span aria-hidden className="np-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                )}
              </div>
            </div>
            <span aria-hidden className="mt-0.5 block text-[11px] font-medium text-cyan-700">
              {progressLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-12 pt-4">
        <div className="np-card-in mb-6 text-center">
          <div className="mb-2 flex justify-center gap-3 text-4xl">
            <span className="np-float" style={{ animationDelay: "0s" }}>🛠️</span>
            <span className="np-float" style={{ animationDelay: ".5s" }}>📋</span>
            <span className="np-float" style={{ animationDelay: "1s" }}>⚡</span>
          </div>
          <h1 className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
            Nová poptávka
          </h1>
          <p className="mt-2 text-gray-600">Popište co potřebujete a získejte nabídky od ověřených fachmanů</p>
        </div>

        {ghostIco && ghostName && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6">
            <strong>Poptávka pro {ghostName}</strong>
            <p className="text-sm mt-1">
              Tento subjekt zatím na Fachmani nemá aktivní profil. Náš tým ho po odeslání
              osobně zkontaktuje a poptávku mu předá.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {quota && !quota.isPremium && quota.dailyUsed >= quota.dailyLimit && quota.dailyExtras === 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-900 p-5 rounded-xl mb-6">
            <strong className="block mb-1">⚠️ Dnes jste vyčerpali bezplatnou poptávku</strong>
            {isIos ? (
              <p className="text-sm">
                Denní limit poptávek je vyčerpán. Limit se resetuje zítra.
              </p>
            ) : (
              <>
                <p className="text-sm mb-3">
                  Free účet má {quota.dailyLimit}× poptávku denně (anti-zneužití). Další poptávku dnes můžete poslat za <strong>{extraRequestPrice} Kč</strong> z peněženky{walletBalance !== null ? ` (zůstatek ${walletBalance} Kč)` : ""}, nebo aktivujte <a href="/predplatne" className="underline font-semibold">Premium</a> pro neomezené poptávky. Limit se resetuje zítra.
                </p>
                {walletBalance !== null && walletBalance < extraRequestPrice && (
                  <a href="/predplatne" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700">
                    Dobít peněženku →
                  </a>
                )}
              </>
            )}
          </div>
        )}

        {quota && !quota.isPremium && quota.dailyExtras > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl mb-6 text-sm">
            ✅ Máte zaplacený <strong>{quota.dailyExtras}× extra slot</strong> na dnes — můžete odeslat poptávku navíc.
          </div>
        )}

        {quota && !quota.isPremium && quota.dailyUsed < quota.dailyLimit && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl mb-6 text-sm">
            🆓 Zbývá vám <strong>{quota.dailyLimit - quota.dailyUsed} z {quota.dailyLimit}</strong> bezplatných poptávek dnes.
            {/* App Store 3.1.1: cenu extra poptávky na iOS neukazujeme */}
            {!isIos && ` Další pak za ${extraRequestPrice} Kč.`}
          </div>
        )}

        <form onSubmit={handleSubmit} className="np-card-in space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-cyan-500/5 ring-1 ring-cyan-100/60 backdrop-blur-sm sm:p-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏷️ Název poptávky *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="např. Výměna vodovodní baterie"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🗂️ Hlavní kategorie *
              </label>
              <select
                value={mainCategoryId}
                onChange={(e) => {
                  setMainCategoryId(e.target.value);
                  setCategoryId(e.target.value);
                }}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              >
                <option value="">Vyberte hlavní kategorii</option>
                {categories
                  .filter((c) => c.parent_id === null)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {iconAsTextPrefix(cat.icon)}{cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Podkategorie
              </label>
              <select
                value={categoryId === mainCategoryId ? "" : categoryId}
                onChange={(e) => setCategoryId(e.target.value || mainCategoryId)}
                disabled={!mainCategoryId || categories.filter((c) => c.parent_id === mainCategoryId).length === 0}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">(volitelné) Upřesnit</option>
                {categories
                  .filter((c) => c.parent_id === mainCategoryId)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {iconAsTextPrefix(cat.icon)}{cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Popis *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              maxLength={2000}
              placeholder="Popište co potřebujete, jaký je stav, případně další detaily..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📷 Fotky (max 5, max 5 MB každá)
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imageFiles.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {imageFiles.length < 5 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-cyan-400 flex flex-col items-center justify-center text-gray-400 hover:text-cyan-500 transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-xs mt-1">Přidat</span>
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Image Cropper Modal */}
          {cropSource && (
            <ImageCropper
              imageSrc={cropSource}
              aspectRatio={16 / 9}
              maxWidth={1200}
              onCropComplete={handleCropComplete}
              onCancel={() => { setCropSource(null); setPendingFile(null); }}
            />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📍 Město / Obec *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="např. Praha"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PSČ
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="např. 11000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rozpočet od (Kč)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="např. 1000"
                step="100"
                min="100"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rozpočet do (Kč)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="např. 5000"
                step="100"
                min="100"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Preferovaný termín
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Urgent upsell */}
          {(() => {
            const urgentFree = !!quota && !quota.isPremium && quota.urgentUsed < quota.urgentFreeLimit;
            const urgentFreeRemaining = quota ? Math.max(0, quota.urgentFreeLimit - quota.urgentUsed) : 0;
            // App Store 3.1.1: na iOS nenabízíme placenou prioritu — toggle jen když je zdarma
            // (free měsíční kvóta nebo premium).
            const urgentAllowed = quota?.isPremium || urgentFree;
            if (isIos && !urgentAllowed) return null;
            return (
              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isUrgent
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-200 bg-white hover:border-amber-300"
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">⚡ Prioritní poptávka</span>
                      {urgentFree ? (
                        <span className="text-emerald-700 text-sm font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                          Zdarma ({urgentFreeRemaining}× / měsíc)
                        </span>
                      ) : (
                        <span className="text-amber-700 text-sm font-bold">+{urgentPrice} Kč</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Poptávka se zobrazí na prvních místech v seznamu a fachmani na ni reagují rychleji.
                      {urgentFree
                        ? (isIos
                            ? ` Máte ${urgentFreeRemaining}× zdarma za měsíc.`
                            : ` Máte ${urgentFreeRemaining}× zdarma za měsíc, dál stojí ${urgentPrice} Kč.`)
                        : " Cena se strhne z vaší peněženky po odeslání."}
                    </p>
                  </div>
                </div>
              </label>
            );
          })()}

          <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-xl">
            <p className="text-sm text-cyan-800">
              ℹ️ Poptávka bude aktivní <strong>{expiryDays} dní</strong>. Během této doby vám budou moci ověření fachmani posílat své nabídky.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="np-cta relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                Odesílám
                <span className="np-dot inline-block h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: "0s" }} />
                <span className="np-dot inline-block h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: ".15s" }} />
                <span className="np-dot inline-block h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: ".3s" }} />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">🚀 Zveřejnit poptávku</span>
            )}
          </button>
        </form>
      </div>

      <Footer />

      {/* WOW: oslava po odeslání */}
      {celebrating && (
        <SuccessCelebration onCta={() => router.push(successUrl.current)} />
      )}

      <style>{`
        @keyframes npAuroraA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.12)} }
        @keyframes npAuroraB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-36px,-28px) scale(1.08)} }
        .np-aurora-a{animation:npAuroraA 24s ease-in-out infinite}
        .np-aurora-b{animation:npAuroraB 28s ease-in-out infinite}
        @keyframes npFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-9px) rotate(-5deg)} }
        .np-float{display:inline-block;animation:npFloat 3.2s ease-in-out infinite}
        @keyframes npCardIn { 0%{opacity:0;transform:translateY(20px) scale(.98)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        .np-card-in{animation:npCardIn .6s cubic-bezier(.22,1,.36,1) both}
        @keyframes npShimmer { 0%{transform:translateX(-120%)} 100%{transform:translateX(220%)} }
        .np-shimmer{animation:npShimmer 1.8s ease-in-out infinite}
        @keyframes npBadgePop { 0%{transform:scale(1)} 50%{transform:scale(1.18) rotate(-6deg)} 100%{transform:scale(1)} }
        .np-badge-pop{animation:npBadgePop .5s cubic-bezier(.34,1.56,.64,1)}
        @keyframes npDot { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-5px);opacity:1} }
        .np-dot{animation:npDot 1s infinite}
        .np-cta::before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(-120%);animation:npShimmer 3.2s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){
          .np-aurora-a,.np-aurora-b,.np-float,.np-card-in,.np-shimmer,.np-badge-pop,.np-dot,.np-cta::before{animation:none}
          .np-card-in{opacity:1;transform:none}
        }
      `}</style>
    </div>
  );
}

export default function NovaPoptavka() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <NovaPoptavkaInner />
    </Suspense>
  );
}