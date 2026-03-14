"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { CheckCircle2, Send, User, Mail, Phone, MessageSquare } from "lucide-react";

interface AdvisorInfo {
  company_name: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
}

export default function ReferralLandingPage() {
  const params = useParams();
  const kod = params.kod as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [advisor, setAdvisor] = useState<AdvisorInfo | null>(null);
  const [referringName, setReferringName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/referral?code=${encodeURIComponent(kod)}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAdvisor(data.advisor);
        setReferringName(data.referring_client_first_name || "");
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    if (kod) fetchInfo();
  }, [kod]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Vyplňte jméno a email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: kod, name, email, phone, message }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Chyba při odeslání");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      toast.success("Odesláno!");
    } catch {
      toast.error("Chyba při odeslání");
    }
    setSubmitting(false);
  }

  const primaryColor = advisor?.brand_primary_color || "#2563eb";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Neplatný odkaz</h1>
        <p className="text-slate-500">
          Tento doporučující odkaz není platný nebo vypršel.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Děkujeme!</h1>
          <p className="text-slate-500">
            Poradce vás bude kontaktovat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div
          className="mb-6 rounded-t-2xl p-8 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${advisor?.brand_secondary_color || "#4f46e5"})`,
          }}
        >
          <h1 className="mb-1 text-2xl font-bold">
            {advisor?.company_name || "Finanční poradenství"}
          </h1>
          {referringName && (
            <p className="text-sm opacity-90">
              Doporučil vás <span className="font-semibold">{referringName}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="rounded-b-2xl bg-white p-8 shadow-lg">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Zanechte nám kontakt
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Vyplňte údaje a poradce se vám ozve.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Jméno *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vaše jméno a příjmení"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+420 ..."
              />
            </div>

            <div>
              <Label htmlFor="message" className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                Zpráva
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Co vás zajímá?"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={submitting}
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-4 w-4" />
              {submitting ? "Odesílání..." : "Odeslat"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
