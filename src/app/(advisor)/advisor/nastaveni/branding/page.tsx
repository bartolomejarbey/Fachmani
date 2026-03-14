"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Palette, Sun, Moon, Upload, Link2, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLOR_PRESETS = [
  { value: "#2563EB", label: "modrá" },
  { value: "#7C3AED", label: "fialová" },
  { value: "#059669", label: "zelená" },
  { value: "#DC2626", label: "červená" },
  { value: "#D97706", label: "oranžová" },
  { value: "#0891B2", label: "cyan" },
  { value: "#4F46E5", label: "indigo" },
  { value: "#BE185D", label: "růžová" },
];

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Poppins",
  "Montserrat",
  "Lato",
  "Nunito",
  "Raleway",
  "Source Sans Pro",
  "Work Sans",
];

interface BrandingState {
  app_name: string;
  logo_url: string;
  logo_icon_url: string;
  logo_size: number;
  logo_shape: string;
  logo_position: string;
  login_slug: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent_color: string;
  brand_background: string;
  brand_font: string;
  brand_font_size: string;
  brand_border_radius: string;
  brand_mode: string;
  client_layout: string;
  advisor_layout: string;
  custom_welcome_text: string;
  custom_login_title: string;
  custom_login_subtitle: string;
  email_footer_text: string;
}

const DEFAULTS: BrandingState = {
  app_name: "FinAdvisor",
  logo_url: "",
  logo_icon_url: "",
  logo_size: 40,
  logo_shape: "original",
  logo_position: "sidebar_top",
  login_slug: "",
  brand_primary: "#2563EB",
  brand_secondary: "#1E40AF",
  brand_accent_color: "#F59E0B",
  brand_background: "#F8FAFC",
  brand_font: "Inter",
  brand_font_size: "medium",
  brand_border_radius: "medium",
  brand_mode: "light",
  client_layout: "classic",
  advisor_layout: "classic",
  custom_welcome_text: "",
  custom_login_title: "",
  custom_login_subtitle: "",
  email_footer_text: "",
};

function getBorderRadius(value: string) {
  return value === "sharp" ? "0px" : value === "rounded" ? "16px" : "8px";
}

function getFontSize(value: string) {
  return value === "small" ? "14px" : value === "large" ? "18px" : "16px";
}

/* ── Layout wireframes ── */
function ClassicWireframe({ color }: { color: string }) {
  return (
    <div className="flex h-16 w-full gap-0.5 rounded overflow-hidden">
      <div className="w-5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 bg-slate-100 p-1">
        <div className="h-1.5 w-6 bg-slate-300 rounded mb-0.5" />
        <div className="h-1 w-8 bg-slate-200 rounded mb-0.5" />
        <div className="h-1 w-7 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

function ModernWireframe({ color }: { color: string }) {
  return (
    <div className="flex flex-col h-16 w-full gap-0.5 rounded overflow-hidden">
      <div className="h-3 w-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 bg-slate-100 p-1">
        <div className="h-1.5 w-6 bg-slate-300 rounded mb-0.5" />
        <div className="h-1 w-8 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

function MinimalistWireframe({ color }: { color: string }) {
  return (
    <div className="flex h-16 w-full gap-0.5 rounded overflow-hidden">
      <div className="w-2.5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 bg-slate-100 p-1">
        <div className="h-1.5 w-6 bg-slate-300 rounded mb-0.5" />
        <div className="h-1 w-8 bg-slate-200 rounded mb-0.5" />
        <div className="h-1 w-7 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

/* ── Logo upload component ── */
function LogoUpload({
  label,
  currentUrl,
  onUrlChange,
  advisorId,
  fileKey,
}: {
  label: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  advisorId: string | null;
  fileKey: string;
}) {
  const [mode, setMode] = useState<"upload" | "url">(
    currentUrl && !currentUrl.includes("/storage/") ? "url" : "upload"
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!advisorId) {
        toast.error("Poradce nebyl načten.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Nahrávejte pouze obrázky.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Maximální velikost je 2 MB.");
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "png";
        const path = `${advisorId}/${fileKey}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("branding")
          .upload(path, file, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Chyba při nahrávání: " + uploadError.message);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
        const publicUrl = urlData.publicUrl + "?t=" + Date.now();
        onUrlChange(publicUrl);
        toast.success("Logo nahráno.");
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error("Nepodařilo se nahrát soubor.");
      } finally {
        setUploading(false);
      }
    },
    [advisorId, fileKey, onUrlChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setMode(mode === "upload" ? "url" : "upload")}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          {mode === "upload" ? (
            <>
              <Link2 className="h-3 w-3" />
              Zadat URL
            </>
          ) : (
            <>
              <Upload className="h-3 w-3" />
              Nahrát soubor
            </>
          )}
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Přetáhněte soubor nebo klikněte</p>
              <p className="text-[10px] text-slate-400">PNG, JPG, SVG — max 2 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <Input
          value={currentUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      )}

      {currentUrl && (
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
          <img src={currentUrl} alt="" className="h-8 max-w-[120px] object-contain" />
          <button
            type="button"
            onClick={() => onUrlChange("")}
            className="ml-auto text-slate-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function BrandingPage() {
  const [state, setState] = useState<BrandingState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    loadBranding();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBranding() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("advisors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Branding load error:", error.message, error.code);
        toast.error("Chyba načítání dat: " + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setAdvisorId(data.id);
        setState((prev) => ({
          ...prev,
          app_name: data.app_name || prev.app_name,
          logo_url: data.logo_url || "",
          logo_icon_url: data.logo_icon_url || "",
          logo_size: data.logo_size || 40,
          logo_shape: data.logo_shape || "original",
          logo_position: data.logo_position || "sidebar_top",
          login_slug: data.login_slug || "",
          brand_primary: data.brand_primary || data.brand_color_primary || prev.brand_primary,
          brand_secondary: data.brand_secondary || data.brand_color_secondary || prev.brand_secondary,
          brand_accent_color: data.brand_accent_color || prev.brand_accent_color,
          brand_background: data.brand_background || prev.brand_background,
          brand_font: data.brand_font || prev.brand_font,
          brand_font_size: data.brand_font_size || prev.brand_font_size,
          brand_border_radius: data.brand_border_radius || prev.brand_border_radius,
          brand_mode: data.brand_mode || prev.brand_mode,
          client_layout: data.client_layout || prev.client_layout,
          advisor_layout: data.advisor_layout || prev.advisor_layout,
          custom_welcome_text: data.custom_welcome_text || "",
          custom_login_title: data.custom_login_title || "",
          custom_login_subtitle: data.custom_login_subtitle || "",
          email_footer_text: data.email_footer_text || "",
        }));
      }
    } catch (err) {
      console.error("Branding load unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten. Obnovte stránku.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();

      const updateData: Record<string, unknown> = {
        app_name: state.app_name,
        logo_url: state.logo_url || null,
        logo_icon_url: state.logo_icon_url || null,
        logo_size: state.logo_size,
        logo_shape: state.logo_shape,
        logo_position: state.logo_position,
        login_slug: state.login_slug || null,
        brand_primary: state.brand_primary,
        brand_secondary: state.brand_secondary,
        brand_color_primary: state.brand_primary,
        brand_color_secondary: state.brand_secondary,
        brand_accent_color: state.brand_accent_color,
        brand_background: state.brand_background,
        brand_font: state.brand_font,
        brand_font_size: state.brand_font_size,
        brand_border_radius: state.brand_border_radius,
        brand_mode: "light", // TODO: dark mode bude implementován později
        client_layout: state.client_layout,
        advisor_layout: state.advisor_layout,
        custom_welcome_text: state.custom_welcome_text || null,
        custom_login_title: state.custom_login_title || null,
        custom_login_subtitle: state.custom_login_subtitle || null,
        email_footer_text: state.email_footer_text || null,
      };

      const { error } = await supabase.from("advisors").update(updateData).eq("id", advisorId);

      if (error) {
        console.error("Branding save error:", error.message, error.code, error.details);
        toast.error("Chyba při ukládání: " + error.message);
        return;
      }

      const root = document.documentElement;
      root.style.setProperty("--color-primary", state.brand_primary);
      root.style.setProperty("--color-secondary", state.brand_secondary);
      root.style.setProperty("--color-accent", state.brand_accent_color);
      root.style.setProperty("--color-background", state.brand_background);
      root.style.setProperty("--font-family", state.brand_font + ", sans-serif");
      root.style.setProperty("--font-size-base", getFontSize(state.brand_font_size));
      root.style.setProperty("--border-radius", getBorderRadius(state.brand_border_radius));

      toast.success("Branding uložen.");
    } catch (err) {
      console.error("Branding save unexpected error:", err);
      toast.error("Nepodařilo se uložit branding.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof BrandingState>(key: K, value: BrandingState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  const borderRadius = getBorderRadius(state.brand_border_radius);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="h-6 w-6 text-slate-600" />
        <h1 className="text-2xl font-bold">Branding a personalizace</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings column (70%) */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* SEKCE 1: Identita */}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Identita</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="app_name">Název aplikace</Label>
                <Input
                  id="app_name"
                  value={state.app_name}
                  onChange={(e) => update("app_name", e.target.value)}
                  placeholder="FinAdvisor"
                />
              </div>

              <LogoUpload
                label="Hlavní logo"
                currentUrl={state.logo_url}
                onUrlChange={(url) => update("logo_url", url)}
                advisorId={advisorId}
                fileKey="logo"
              />

              <LogoUpload
                label="Ikona / favicon"
                currentUrl={state.logo_icon_url}
                onUrlChange={(url) => update("logo_icon_url", url)}
                advisorId={advisorId}
                fileKey="icon"
              />

              {/* Logo size */}
              <div>
                <Label>Velikost loga</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={24}
                    max={120}
                    value={state.logo_size}
                    onChange={(e) => setState((prev) => ({ ...prev, logo_size: parseInt(e.target.value) }))}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-xs text-slate-500 font-mono w-10 text-right">{state.logo_size}px</span>
                </div>
                {state.logo_url && (
                  <div className="mt-2 flex items-center justify-center rounded-lg bg-slate-50 p-3">
                    <img
                      src={state.logo_url}
                      alt="Náhled"
                      style={{
                        height: `${state.logo_size}px`,
                        borderRadius: state.logo_shape === "circle" ? "50%" : state.logo_shape === "square" ? "4px" : "0",
                        objectFit: state.logo_shape !== "original" ? "cover" : "contain",
                        aspectRatio: state.logo_shape !== "original" ? "1/1" : "auto",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Logo shape */}
              <div>
                <Label>Tvar loga</Label>
                <div className="flex gap-2 mt-2">
                  {([
                    { value: "original", label: "Originál", preview: "rounded-none" },
                    { value: "square", label: "Čtverec", preview: "rounded" },
                    { value: "circle", label: "Kruh", preview: "rounded-full" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("logo_shape", opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        state.logo_shape === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`h-8 w-8 bg-slate-300 ${opt.preview}`} style={{
                        borderRadius: opt.value === "original" ? "2px" : opt.value === "square" ? "4px" : "50%",
                        aspectRatio: "1/1",
                      }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo position */}
              <div>
                <Label>Umístění loga</Label>
                <div className="flex gap-2 mt-2">
                  {([
                    { value: "sidebar_top", label: "Sidebar nahoře" },
                    { value: "sidebar_center", label: "Sidebar uprostřed" },
                    { value: "above_nav", label: "Nad navigací" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("logo_position", opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                        state.logo_position === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {/* Mini wireframe */}
                      <div className="flex h-12 w-full gap-0.5 rounded overflow-hidden">
                        <div className="w-5 shrink-0 bg-slate-800 flex flex-col items-center py-0.5 gap-0.5">
                          {opt.value === "sidebar_top" && <div className="h-1.5 w-3 rounded-sm bg-blue-400" />}
                          {opt.value === "sidebar_center" && <div className="flex-1" />}
                          {opt.value === "sidebar_center" && <div className="h-1.5 w-3 rounded-sm bg-blue-400" />}
                          {opt.value === "sidebar_center" && <div className="flex-1" />}
                          <div className="h-1 w-3 rounded-sm bg-white/20" />
                          <div className="h-1 w-3 rounded-sm bg-white/20" />
                          {opt.value === "above_nav" && <div className="flex-1" />}
                        </div>
                        <div className="flex-1 bg-slate-100 p-0.5">
                          {opt.value === "above_nav" && <div className="h-1.5 w-4 rounded-sm bg-blue-400 mb-0.5" />}
                          <div className="h-1 w-5 bg-slate-300 rounded-sm mb-0.5" />
                          <div className="h-1 w-4 bg-slate-200 rounded-sm" />
                        </div>
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="login_slug">Login slug</Label>
                <Input
                  id="login_slug"
                  value={state.login_slug}
                  onChange={(e) => update("login_slug", e.target.value)}
                  placeholder="moje-firma"
                />
                {state.login_slug && (
                  <p className="text-xs text-slate-500 mt-1">
                    URL: {origin}/login/{state.login_slug}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SEKCE 2: Barvy */}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Barvy</h2>
            <div className="space-y-4">
              <div>
                <Label>Primární barva</Label>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      title={preset.label}
                      onClick={() => update("brand_primary", preset.value)}
                      className="h-8 w-8 rounded-full transition-all"
                      style={{
                        backgroundColor: preset.value,
                        boxShadow:
                          state.brand_primary === preset.value
                            ? `0 0 0 3px white, 0 0 0 5px ${preset.value}`
                            : "none",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={state.brand_primary}
                    onChange={(e) => update("brand_primary", e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                    title="Vlastní barva"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorField
                  label="Sekundární"
                  value={state.brand_secondary}
                  onChange={(v) => update("brand_secondary", v)}
                />
                <ColorField
                  label="Akcentová"
                  value={state.brand_accent_color}
                  onChange={(v) => update("brand_accent_color", v)}
                />
                <ColorField
                  label="Pozadí"
                  value={state.brand_background}
                  onChange={(v) => update("brand_background", v)}
                />
              </div>
            </div>
          </section>

          {/* SEKCE 3: Typografie */}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Typografie</h2>
            <div className="space-y-4">
              <div>
                <Label>Font</Label>
                <Select value={state.brand_font} onValueChange={(v) => update("brand_font", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Velikost písma</Label>
                <div className="flex gap-2 mt-2">
                  {(
                    [
                      { value: "small", label: "Kompaktní (14px)" },
                      { value: "medium", label: "Standardní (16px)" },
                      { value: "large", label: "Velké (18px)" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("brand_font_size", opt.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        state.brand_font_size === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Zakulacení rohů</Label>
                <div className="flex gap-2 mt-2">
                  {(
                    [
                      { value: "sharp", label: "Ostré", radius: "0px" },
                      { value: "medium", label: "Střední", radius: "8px" },
                      { value: "rounded", label: "Kulaté", radius: "16px" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("brand_border_radius", opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        state.brand_border_radius === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className="h-8 w-8 border-2 border-current"
                        style={{ borderRadius: opt.radius }}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SEKCE 4: Rozložení */}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Rozložení</h2>
            <div className="space-y-5">
              <LayoutPicker
                label="Layout klientského portálu"
                value={state.client_layout}
                onChange={(v) => update("client_layout", v)}
                color={state.brand_primary}
              />
              <LayoutPicker
                label="Layout poradcovského panelu"
                value={state.advisor_layout}
                onChange={(v) => update("advisor_layout", v)}
                color={state.brand_primary}
              />
              {/* TODO: Dark mode bude implementován později — vyžaduje dark: varianty na všech komponentách */}
            </div>
          </section>

          {/* SEKCE 5: Texty */}
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Texty</h2>
            <div className="space-y-4">
              <div>
                <Label>Uvítací text na dashboardu</Label>
                <Textarea
                  value={state.custom_welcome_text}
                  onChange={(e) => update("custom_welcome_text", e.target.value)}
                  placeholder="Vítejte v klientském portálu..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Titulek přihlašovací stránky</Label>
                <Input
                  value={state.custom_login_title}
                  onChange={(e) => update("custom_login_title", e.target.value)}
                  placeholder="Přihlášení do portálu"
                />
              </div>
              <div>
                <Label>Podtitulek přihlašovací stránky</Label>
                <Input
                  value={state.custom_login_subtitle}
                  onChange={(e) => update("custom_login_subtitle", e.target.value)}
                  placeholder="Zadejte své přihlašovací údaje"
                />
              </div>
              <div>
                <Label>Text patičky emailů</Label>
                <Input
                  value={state.email_footer_text}
                  onChange={(e) => update("email_footer_text", e.target.value)}
                  placeholder="© 2026 Vaše firma. Všechna práva vyhrazena."
                />
              </div>
            </div>
          </section>

          {/* Save button — mobile */}
          <div className="lg:hidden pb-4">
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? "Ukládám..." : "Uložit branding"}
            </Button>
          </div>
        </div>

        {/* Preview column (30%) — desktop only */}
        <div className="hidden lg:block w-[250px] shrink-0">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Náhled
              </h3>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                {saving ? "Ukládám..." : "Uložit"}
              </Button>
            </div>
            <div
              className="w-[250px] h-[400px] border rounded-xl overflow-hidden shadow-sm"
              style={{
                fontFamily: state.brand_font + ", sans-serif",
                fontSize: "11px",
                backgroundColor:
                  state.brand_mode === "dark" ? "#1E293B" : state.brand_background,
                color: state.brand_mode === "dark" ? "#F1F5F9" : "#1E293B",
              }}
            >
              {state.client_layout === "modern" ? (
                <div className="flex flex-col h-full">
                  <div
                    className="h-8 flex items-center px-2 gap-1.5 shrink-0"
                    style={{ backgroundColor: state.brand_primary }}
                  >
                    {state.logo_url ? (
                      <img src={state.logo_url} alt="" style={{
                        height: `${Math.min(state.logo_size * 0.4, 20)}px`,
                        objectFit: state.logo_shape !== "original" ? "cover" : "contain",
                        borderRadius: state.logo_shape === "circle" ? "50%" : state.logo_shape === "square" ? "2px" : "0",
                        aspectRatio: state.logo_shape !== "original" ? "1/1" : "auto",
                      }} />
                    ) : (
                      <span className="text-white text-[10px] font-bold">
                        {state.app_name}
                      </span>
                    )}
                    <div className="flex-1" />
                    <div className="h-3 w-3 rounded-full bg-white/30" />
                  </div>
                  <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
                    <PreviewBody state={state} borderRadius={borderRadius} />
                  </div>
                </div>
              ) : (
                <div className="flex h-full">
                  <div
                    className="flex flex-col items-center py-2 px-0.5 gap-1.5 shrink-0"
                    style={{
                      backgroundColor: state.brand_primary,
                      width: state.client_layout === "minimalist" ? "24px" : "40px",
                    }}
                  >
                    {state.client_layout === "classic" && (
                      <>
                        {state.logo_url ? (
                          <img
                            src={state.logo_url}
                            alt=""
                            style={{
                              height: `${Math.min(state.logo_size * 0.35, 16)}px`,
                              width: `${Math.min(state.logo_size * 0.35, 16)}px`,
                              objectFit: state.logo_shape !== "original" ? "cover" : "contain",
                              borderRadius: state.logo_shape === "circle" ? "50%" : state.logo_shape === "square" ? "2px" : "0",
                            }}
                          />
                        ) : (
                          <span className="text-white text-[7px] font-bold">
                            {state.app_name.substring(0, 2)}
                          </span>
                        )}
                        <div className="h-2 w-5 rounded bg-white/20 mt-1" />
                        <div className="h-2 w-5 rounded bg-white/20" />
                        <div className="h-2 w-5 rounded bg-white/30" />
                      </>
                    )}
                    {state.client_layout === "minimalist" && (
                      <>
                        <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                      </>
                    )}
                  </div>
                  <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
                    <PreviewBody state={state} borderRadius={borderRadius} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border-0 p-0"
        />
        <span className="text-xs text-slate-900 font-mono">{value}</span>
      </div>
    </div>
  );
}

function LayoutPicker({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  const options = [
    { value: "classic", label: "Klasický", Wireframe: ClassicWireframe },
    { value: "modern", label: "Moderní", Wireframe: ModernWireframe },
    { value: "minimalist", label: "Minimalistický", Wireframe: MinimalistWireframe },
  ];

  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`p-2.5 rounded-lg border-2 transition-colors ${
              value === opt.value
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <opt.Wireframe color={color} />
            <p className="text-xs font-medium mt-1.5 text-slate-600">{opt.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewBody({
  state,
  borderRadius,
}: {
  state: BrandingState;
  borderRadius: string;
}) {
  return (
    <>
      <p
        className="font-semibold text-[11px]"
        style={{ fontFamily: state.brand_font + ", sans-serif" }}
      >
        {state.custom_welcome_text || "Vítejte zpět"}
      </p>
      <button
        className="text-white text-[9px] px-2.5 py-1 font-medium"
        style={{ backgroundColor: state.brand_primary, borderRadius }}
      >
        Akce
      </button>
      <div
        className="p-1.5 border"
        style={{
          backgroundColor:
            state.brand_mode === "dark" ? "#334155" : state.brand_background,
          borderRadius,
          borderColor: state.brand_mode === "dark" ? "#475569" : "#E2E8F0",
        }}
      >
        <div className="h-1.5 w-12 bg-slate-300 rounded mb-0.5" />
        <div className="h-1.5 w-8 bg-slate-200 rounded" />
      </div>
      <span
        className="inline-block text-[8px] text-white px-1.5 py-0.5 font-medium"
        style={{ backgroundColor: state.brand_accent_color, borderRadius }}
      >
        Badge
      </span>
      <div
        className="h-1 w-14 rounded"
        style={{ backgroundColor: state.brand_secondary }}
      />
    </>
  );
}
