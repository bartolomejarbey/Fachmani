"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building2,
  Palette,
  Layout,
  Boxes,
  Brain,
  UserPlus,
  PartyPopper,
  Lock,
  Upload,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// ---------------------------------------------------------------------------
// Module definitions – ALL keys required
// ---------------------------------------------------------------------------
const MODULE_LABELS: Record<string, { label: string; description: string; recommended?: boolean }> = {
  crm: { label: "CRM Pipeline", description: "Kanban správa dealů", recommended: true },
  portal: { label: "Klientský portál", description: "Přístup klientů k datům", recommended: true },
  templates: { label: "Emailové šablony", description: "Předpřipravené emaily" },
  scoring: { label: "Klientský scoring", description: "Automatické hodnocení klientů", recommended: true },
  automations: { label: "Automatizace", description: "Pravidla a workflow" },
  meta_ads: { label: "Meta Ads", description: "Propojení s Meta reklamami" },
  ocr: { label: "OCR rozpoznávání", description: "Automatické čtení dokumentů" },
  ai_assistant: { label: "AI asistent", description: "AI doporučení a analýzy", recommended: true },
  osvc: { label: "OSVČ modul", description: "Evidence příjmů a výdajů" },
  calendar: { label: "Kalendář", description: "Synchronizace kalendáře" },
  campaigns: { label: "Kampaně", description: "Hromadné oslovení klientů" },
  email_templates: { label: "Email šablony (pokročilé)", description: "Vizuální editor emailů" },
  vault: { label: "Trezor dokumentů", description: "Bezpečné úložiště souborů" },
  chatbot: { label: "Chatbot", description: "Automatický chat na webu" },
  referral: { label: "Referral program", description: "Doporučení od klientů" },
  life_events: { label: "Životní události", description: "Sledování milníků klientů" },
  milestones: { label: "Milníky", description: "Sledování pokroku klienta" },
  news_feed: { label: "Novinky", description: "Aktuality a články" },
  health_score: { label: "Health Score", description: "Finanční zdraví klienta" },
  scenarios: { label: "Scénáře", description: "Modelování finančních situací" },
  coverage_check: { label: "Kontrola krytí", description: "Analýza pojistného krytí" },
  family: { label: "Rodinní příslušníci", description: "Evidence rodinných vazeb" },
  activity_tracking: { label: "Sledování aktivit", description: "Log komunikace s klientem" },
  wishlist: { label: "Wishlist", description: "Přání a cíle klienta" },
  articles: { label: "Články", description: "Publikace pro klienty" },
  seasonal_reminders: { label: "Sezónní připomínky", description: "Automatické připomínky dle období" },
  satisfaction: { label: "Spokojenost", description: "Dotazníky spokojenosti" },
  comparison: { label: "Srovnání produktů", description: "Porovnání nabídek" },
  duplicate_detection: { label: "Detekce duplicit", description: "Odhalení duplicitních záznamů" },
  qr_payments: { label: "QR platby", description: "Generování QR platebních kódů" },
};

// ---------------------------------------------------------------------------
// Color presets
// ---------------------------------------------------------------------------
const COLOR_PRESETS = [
  "#3B82F6",
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

// ---------------------------------------------------------------------------
// Font options
// ---------------------------------------------------------------------------
const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Syne", label: "Syne" },
  { value: "Poppins", label: "Poppins" },
  { value: "DM Sans", label: "DM Sans" },
];

// ---------------------------------------------------------------------------
// Layout options
// ---------------------------------------------------------------------------
const LAYOUT_OPTIONS = [
  {
    value: "classic",
    label: "Klasický",
    description: "Tradiční rozložení s postranním panelem",
  },
  {
    value: "modern",
    label: "Moderní",
    description: "Vzdušný design s kartami",
  },
  {
    value: "minimal",
    label: "Minimalistický",
    description: "Čistý a jednoduchý vzhled",
  },
];

// ---------------------------------------------------------------------------
// Default AI rules
// ---------------------------------------------------------------------------
const DEFAULT_AI_RULES = [
  {
    id: "refinancing",
    label: "Upozornit na refinancování",
    description: "Automaticky detekuje klienty s vysokou úrokovou sazbou",
    enabled: true,
  },
  {
    id: "cross_sell",
    label: "Cross-sell příležitosti",
    description: "Navrhuje produkty na základě profilu klienta",
    enabled: true,
  },
  {
    id: "expiration_reminder",
    label: "Připomínka expirace",
    description: "Upozorní na blížící se konec smlouvy",
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdvisorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Whether ai_assistant is available in the advisor's plan
  const [hasAi, setHasAi] = useState(false);
  // Plan features from subscription_plans
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planName, setPlanName] = useState("");

  // Track what was done for summary
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [clientAdded, setClientAdded] = useState(false);

  // Step 2 – Company
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");

  // Step 3 – Branding
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [appName, setAppName] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 4 – Layout
  const [clientLayout, setClientLayout] = useState("classic");
  const [advisorLayout, setAdvisorLayout] = useState("classic");

  // Step 5 – Modules
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    Object.keys(MODULE_LABELS).forEach((k) => {
      defaults[k] = MODULE_LABELS[k].recommended || false;
    });
    return defaults;
  });

  // Step 6 – AI Rules
  const [aiRules, setAiRules] = useState(DEFAULT_AI_RULES);
  const [interestRateThreshold, setInterestRateThreshold] = useState("5");

  // Step 7 – First client
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isOsvc, setIsOsvc] = useState(false);

  // Computed total steps: 7 if AI not in plan, 8 if it is
  const TOTAL_STEPS = hasAi ? 8 : 7;

  // Map visual step to logical step (skipping AI step 6 when not in plan)
  const mapStep = useCallback(
    (visualStep: number): number => {
      if (hasAi) return visualStep;
      // When no AI: steps 1-5 map 1:1, visual 6 -> logical 7, visual 7 -> logical 8
      if (visualStep <= 5) return visualStep;
      return visualStep + 1;
    },
    [hasAi]
  );

  // Reverse map for display
  const displayStep = useCallback(
    (logicalStep: number): number => {
      if (hasAi) return logicalStep;
      if (logicalStep <= 5) return logicalStep;
      return logicalStep - 1;
    },
    [hasAi]
  );

  const currentDisplay = displayStep(step);

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: adv, error: advError } = await supabase
          .from("advisors")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (advError) {
          console.error("Onboarding init – advisor query error:", advError.message);
          if (advError.code === "PGRST116") {
            setInitError("Pro váš účet nebyl nalezen záznam poradce. Kontaktujte podporu.");
          } else {
            setInitError(`Chyba načítání dat: ${advError.message || "Neznámá chyba"}`);
          }
          return;
        }
        if (!adv) {
          setInitError("Pro váš účet nebyl nalezen záznam poradce. Kontaktujte podporu.");
          return;
        }

        if (adv.onboarding_completed) {
          router.push("/advisor");
          return;
        }

        setAdvisorId(adv.id);
        if (adv.company_name) setCompanyName(adv.company_name);
        if (adv.phone) setPhone(adv.phone);
        if (adv.email) setEmail(adv.email);
        if (adv.ico) setIco(adv.ico);
        if (adv.dic) setDic(adv.dic);
        if (adv.logo_url) {
          setLogoUrl(adv.logo_url);
          setLogoPreview(adv.logo_url);
          setLogoUploaded(true);
        }
        if (adv.app_name) setAppName(adv.app_name);
        if (adv.font_family) setFontFamily(adv.font_family);
        if (adv.client_layout) setClientLayout(adv.client_layout);
        if (adv.advisor_layout) setAdvisorLayout(adv.advisor_layout);

        const brandPrimary = adv.brand_primary || adv.brand_color_primary;
        if (brandPrimary) setPrimaryColor(brandPrimary);

        if (adv.enabled_modules && typeof adv.enabled_modules === "object" && Object.keys(adv.enabled_modules).length > 0) {
          setEnabledModules(adv.enabled_modules);
        }

        if (adv.ai_rules && typeof adv.ai_rules === "object") {
          // Merge saved rules with defaults
          const saved = adv.ai_rules as { rules?: typeof DEFAULT_AI_RULES; threshold?: string };
          if (saved.rules) setAiRules(saved.rules);
          if (saved.threshold) setInterestRateThreshold(saved.threshold);
        }
        if (adv.interest_rate_threshold) {
          setInterestRateThreshold(String(adv.interest_rate_threshold));
        }

        // Load plan features
        if (adv.selected_plan_id) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("name, features")
            .eq("id", adv.selected_plan_id)
            .single();
          if (plan) {
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];
            setPlanFeatures(features);
            setPlanName(plan.name || "");
            setHasAi(features.includes("ai_assistant"));
          }
        }

        // Save onboarding progress (non-critical)
        supabase
          .from("onboarding_progress")
          .upsert({ user_id: user.id, role: "advisor", steps: {} }, { onConflict: "user_id,role" })
          .then(({ error }) => {
            if (error) console.warn("Onboarding progress upsert failed (non-critical):", error.message);
          });
      } catch (err) {
        console.error("Onboarding init – unexpected error:", err);
        setInitError("Neočekávaná chyba při načítání. Zkuste obnovit stránku.");
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Save progress helper
  // -------------------------------------------------------------------------
  async function saveProgress(stepKey: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: progress } = await supabase
        .from("onboarding_progress")
        .select("steps")
        .eq("user_id", user.id)
        .eq("role", "advisor")
        .single();
      const steps = { ...(progress?.steps || {}), [stepKey]: true };
      await supabase.from("onboarding_progress").update({ steps }).eq("user_id", user.id).eq("role", "advisor");
    } catch (e) {
      console.warn("saveProgress failed (non-critical):", e);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 – Save company
  // -------------------------------------------------------------------------
  async function handleSaveCompany() {
    setCompanyError(null);
    if (!advisorId) {
      const msg = "Chyba: poradce nebyl načten. Zkuste obnovit stránku.";
      setCompanyError(msg);
      toast.error(msg);
      return;
    }
    if (!companyName.trim()) {
      setCompanyError("Vyplňte název firmy.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("advisors")
        .update({
          company_name: companyName.trim(),
          phone: phone || null,
          email: email || null,
          ico: ico || null,
          dic: dic || null,
        })
        .eq("id", advisorId);
      if (error) {
        setCompanyError(`Chyba ukládání: ${error.message}`);
        toast.error("Nepodařilo se uložit údaje.");
        setLoading(false);
        return;
      }
      await saveProgress("company");
      setLoading(false);
      setStep(3);
    } catch {
      setCompanyError("Neočekávaná chyba při ukládání.");
      toast.error("Neočekávaná chyba při ukládání.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 3 – Logo upload + branding
  // -------------------------------------------------------------------------
  async function uploadLogo(file: File) {
    if (!advisorId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${advisorId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (uploadError) {
        toast.error("Nepodařilo se nahrát logo.");
        setUploadingLogo(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const url = urlData.publicUrl;
      setLogoUrl(url);
      setLogoUploaded(true);
      await supabase.from("advisors").update({ logo_url: url }).eq("id", advisorId);
      toast.success("Logo nahráno!");
    } catch {
      toast.error("Chyba při nahrávání loga.");
    }
    setUploadingLogo(false);
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      uploadLogo(file);
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      uploadLogo(file);
    }
  }

  async function handleSaveBranding() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({
          brand_color_primary: primaryColor,
          brand_primary: primaryColor,
          font_family: fontFamily,
          app_name: appName || null,
        })
        .eq("id", advisorId);
      await saveProgress("branding");
      setLoading(false);
      setStep(4);
    } catch {
      toast.error("Chyba při ukládání brandingu.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 4 – Save layout
  // -------------------------------------------------------------------------
  async function handleSaveLayout() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({ client_layout: clientLayout, advisor_layout: advisorLayout })
        .eq("id", advisorId);
      await saveProgress("layout");
      setLoading(false);
      setStep(5);
    } catch {
      toast.error("Chyba při ukládání rozložení.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 5 – Save modules
  // -------------------------------------------------------------------------
  async function handleSaveModules() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase.from("advisors").update({ enabled_modules: enabledModules }).eq("id", advisorId);
      await saveProgress("modules");
      setLoading(false);
      // If AI is in plan, go to step 6 (AI Rules), otherwise skip to step 7 (First client)
      setStep(hasAi ? 6 : 7);
    } catch {
      toast.error("Chyba při ukládání modulů.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 6 – Save AI rules
  // -------------------------------------------------------------------------
  async function handleSaveAiRules() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({
          ai_rules: { rules: aiRules, threshold: interestRateThreshold },
          interest_rate_threshold: parseFloat(interestRateThreshold) || 5,
        })
        .eq("id", advisorId);
      await saveProgress("ai_rules");
      setLoading(false);
      setStep(7);
    } catch {
      toast.error("Chyba při ukládání AI pravidel.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 7 – Create first client
  // -------------------------------------------------------------------------
  async function handleCreateClient() {
    if (!advisorId || !firstName.trim() || !lastName.trim()) {
      toast.error("Vyplňte jméno a příjmení.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("clients").insert({
        advisor_id: advisorId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        is_osvc: isOsvc,
      });
      if (error) {
        toast.error("Nepodařilo se vytvořit klienta.");
        setLoading(false);
        return;
      }
      toast.success("Klient vytvořen!");
      setClientAdded(true);
      await saveProgress("first_client");
      setLoading(false);
      setStep(8);
    } catch {
      toast.error("Chyba při vytváření klienta.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 8 – Finish
  // -------------------------------------------------------------------------
  async function handleFinish() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase.from("advisors").update({ onboarding_completed: true }).eq("id", advisorId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("onboarding_progress")
          .update({ completed_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("role", "advisor");
      }
      setLoading(false);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => router.push("/advisor"), 1500);
    } catch {
      toast.error("Chyba při dokončování.");
      setLoading(false);
    }
  }

  // Fire confetti when reaching the final step
  useEffect(() => {
    if (step === 8) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [step]);

  // -------------------------------------------------------------------------
  // Count enabled modules for summary
  // -------------------------------------------------------------------------
  const enabledModulesCount = useMemo(
    () => Object.values(enabledModules).filter(Boolean).length,
    [enabledModules]
  );

  // -------------------------------------------------------------------------
  // Progress bar with circles
  // -------------------------------------------------------------------------
  function ProgressBar() {
    const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const isCompleted = currentDisplay > s;
            const isCurrent = currentDisplay === s;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-500 text-white"
                      : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 transition-all ${
                      currentDisplay > s ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-xs text-slate-500">
          Krok {currentDisplay} z {TOTAL_STEPS}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Layout card mini mockup
  // -------------------------------------------------------------------------
  function LayoutMockup({ type }: { type: string }) {
    if (type === "classic") {
      return (
        <div className="flex h-20 w-full gap-0.5 rounded border border-slate-200 overflow-hidden">
          <div className="w-1/4 bg-slate-700" />
          <div className="flex-1 bg-slate-100 p-1">
            <div className="h-2 w-3/4 rounded bg-slate-300 mb-1" />
            <div className="h-2 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      );
    }
    if (type === "modern") {
      return (
        <div className="h-20 w-full rounded border border-slate-200 overflow-hidden bg-slate-50 p-1.5">
          <div className="h-3 w-full rounded bg-slate-700 mb-1" />
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded bg-slate-200" />
            <div className="h-6 flex-1 rounded bg-slate-200" />
            <div className="h-6 flex-1 rounded bg-slate-200" />
          </div>
        </div>
      );
    }
    // minimal
    return (
      <div className="h-20 w-full rounded border border-slate-200 overflow-hidden bg-white p-2">
        <div className="h-2 w-1/3 rounded bg-slate-300 mb-2" />
        <div className="h-2 w-2/3 rounded bg-slate-200 mb-1" />
        <div className="h-2 w-1/2 rounded bg-slate-200" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl">
        <ProgressBar />

        <div className="rounded-2xl border bg-white p-8 shadow-lg">
          {/* Init error banner */}
          {initError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {initError}
              <button onClick={() => window.location.reload()} className="ml-2 underline">
                Obnovit stránku
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 1 – Welcome */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900">
                Vítejte ve FinAdvisor{companyName ? `, ${companyName}` : ""}!
              </h1>
              <p className="mb-6 text-slate-500">Pojďme nastavit váš účet. Zabere to pár minut.</p>
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Pojďme na to <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 2 – Company info */}
          {/* ============================================================= */}
          {step === 2 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Vaše firma</h2>
                  <p className="text-xs text-slate-500">Základní údaje o vaší firmě</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Název firmy *</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setCompanyError(null);
                    }}
                    placeholder="Vaše firma s.r.o."
                    className={!companyName.trim() && companyError ? "border-red-400" : ""}
                  />
                  {companyError && <p className="text-xs text-red-500">{companyError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 ..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@firma.cz" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">IČO</Label>
                    <Input value={ico} onChange={(e) => setIco(e.target.value)} placeholder="12345678" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">DIČ</Label>
                    <Input value={dic} onChange={(e) => setDic(e.target.value)} placeholder="CZ12345678" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveCompany} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 3 – Branding */}
          {/* ============================================================= */}
          {step === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Palette className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Branding</h2>
                  <p className="text-xs text-slate-500">Přizpůsobte si vzhled aplikace</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left – controls */}
                <div className="space-y-4">
                  {/* Logo upload */}
                  <div className="space-y-1">
                    <Label className="text-xs">Logo</Label>
                    <div
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-4 hover:border-blue-400 transition-colors cursor-pointer"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleLogoDrop}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      ) : logoPreview ? (
                        <div className="relative">
                          <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain rounded" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogoPreview(null);
                              setLogoFile(null);
                              setLogoUrl(null);
                              setLogoUploaded(false);
                            }}
                            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-0.5 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500">Přetáhněte nebo klikněte</span>
                        </>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoSelect}
                      />
                    </div>
                  </div>

                  {/* Primary color */}
                  <div className="space-y-1">
                    <Label className="text-xs">Primární barva</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          className={`h-8 w-8 rounded-lg border-2 transition-all ${
                            primaryColor === color ? "border-slate-900 scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setPrimaryColor(color)}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border-0"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono text-xs flex-1"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  {/* Font */}
                  <div className="space-y-1">
                    <Label className="text-xs">Písmo</Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* App name */}
                  <div className="space-y-1">
                    <Label className="text-xs">Název aplikace pro klienty</Label>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="FinAdvisor"
                    />
                    <p className="text-[10px] text-slate-400">Co uvidí klienti místo &quot;FinAdvisor&quot;</p>
                  </div>
                </div>

                {/* Right – live preview */}
                <div className="space-y-1">
                  <Label className="text-xs">Náhled</Label>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="flex h-48 rounded-lg overflow-hidden border">
                      {/* Mini sidebar */}
                      <div
                        className="w-14 flex flex-col items-center py-3 gap-3"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="" className="h-7 w-7 rounded object-contain bg-white/20" />
                        ) : (
                          <div className="h-7 w-7 rounded bg-white/20" />
                        )}
                        <div className="h-1.5 w-6 rounded bg-white/40" />
                        <div className="h-1.5 w-6 rounded bg-white/20" />
                        <div className="h-1.5 w-6 rounded bg-white/20" />
                        <div className="h-1.5 w-6 rounded bg-white/20" />
                      </div>
                      {/* Main area */}
                      <div className="flex-1 bg-white p-3">
                        <p
                          className="text-[10px] font-bold mb-2"
                          style={{ color: primaryColor, fontFamily }}
                        >
                          {appName || "FinAdvisor"}
                        </p>
                        <div className="h-2 w-3/4 rounded bg-slate-200 mb-1.5" />
                        <div className="h-2 w-1/2 rounded bg-slate-100 mb-3" />
                        <div className="flex gap-1.5">
                          <div className="h-10 flex-1 rounded bg-slate-100" />
                          <div className="h-10 flex-1 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveBranding} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 4 – Layout */}
          {/* ============================================================= */}
          {step === 4 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                  <Layout className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Rozložení</h2>
                  <p className="text-xs text-slate-500">Vyberte rozložení klientského portálu</p>
                </div>
              </div>

              {/* Client layout */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-3">Klientský portál</p>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        clientLayout === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setClientLayout(opt.value)}
                    >
                      <LayoutMockup type={opt.value} />
                      <p className="mt-2 text-xs font-medium text-slate-900">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advisor layout */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Rozložení admin panelu</p>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        advisorLayout === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setAdvisorLayout(opt.value)}
                    >
                      <LayoutMockup type={opt.value} />
                      <p className="mt-2 text-xs font-medium text-slate-900">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveLayout} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 5 – Modules */}
          {/* ============================================================= */}
          {step === 5 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Moduly</h2>
                  <p className="text-xs text-slate-500">Vyberte moduly, které chcete používat</p>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Object.entries(MODULE_LABELS).map(([key, { label, description, recommended }]) => {
                  const inPlan = planFeatures.length === 0 || planFeatures.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        !inPlan ? "opacity-50 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{label}</p>
                          {recommended && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              Doporučeno
                            </span>
                          )}
                          {!inPlan && (
                            <span className="flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600" title={`Dostupné v plánu ${planName}`}>
                              <Lock className="h-3 w-3" />
                              {planName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{description}</p>
                      </div>
                      {inPlan ? (
                        <Switch
                          checked={enabledModules[key] ?? false}
                          onCheckedChange={(checked) =>
                            setEnabledModules((prev) => ({ ...prev, [key]: checked }))
                          }
                        />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveModules} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 6 – AI Rules (only when hasAi) */}
          {/* ============================================================= */}
          {step === 6 && hasAi && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">AI pravidla</h2>
                  <p className="text-xs text-slate-500">Nastavte automatická pravidla AI asistenta</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {aiRules.map((rule, idx) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-slate-900">{rule.label}</p>
                      <p className="text-xs text-slate-500">{rule.description}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => {
                        setAiRules((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, enabled: checked } : r))
                        );
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-4">
                <Label className="text-xs">Práh úrokové sazby pro refinancování (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={interestRateThreshold}
                    onChange={(e) => setInterestRateThreshold(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Klienti se sazbou nad tuto hodnotu budou označeni k refinancování
                </p>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveAiRules} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 7 – First client */}
          {/* ============================================================= */}
          {step === 7 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">První klient</h2>
                  <p className="text-xs text-slate-500">Přidejte svého prvního klienta</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Jméno *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jan" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Příjmení *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Novák" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="jan@novak.cz"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+420 ..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOsvc"
                    checked={isOsvc}
                    onChange={(e) => setIsOsvc(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="isOsvc" className="text-sm text-slate-700 cursor-pointer">
                    Je OSVČ
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(hasAi ? 6 : 5)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      saveProgress("first_client_skipped");
                      setStep(8);
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
                  >
                    Přidám později
                  </button>
                  <Button
                    onClick={handleCreateClient}
                    disabled={loading || !firstName.trim() || !lastName.trim()}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Přidat <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 8 – Done! */}
          {/* ============================================================= */}
          {step === 8 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-slate-900">Vše je připraveno!</h1>

              {/* Summary */}
              <div className="mx-auto mb-6 max-w-sm space-y-2 text-left">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Firma: <span className="font-medium">{companyName || "—"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {logoUploaded ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">
                    Logo: <span className="font-medium">{logoUploaded ? "Nahráno" : "Nenastaveno"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Barva:{" "}
                    <span
                      className="inline-block h-3 w-3 rounded-full align-middle mr-1"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="font-medium font-mono text-xs">{primaryColor}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Moduly: <span className="font-medium">{enabledModulesCount} aktivních</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {clientAdded ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">
                    Klient: <span className="font-medium">{clientAdded ? "Přidán" : "Přidáte později"}</span>
                  </span>
                </div>
              </div>

              <p className="mb-6 text-xs text-slate-500">Všechna nastavení můžete kdykoliv změnit v sekci Nastavení.</p>

              <Button onClick={handleFinish} disabled={loading} className="w-full" size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Přejít do přehledu <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
