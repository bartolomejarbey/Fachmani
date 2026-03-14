"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";

interface ProductRow {
  name: string;
  description: string;
  price: number;
}

interface OfferGeneratorProps {
  clientId?: string;
  dealId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdvisorInfo {
  company_name: string | null;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  logo_url: string | null;
  brand_color_primary: string | null;
}

interface ClientInfo {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export function OfferGenerator({
  clientId,
  dealId,
  open,
  onOpenChange,
}: OfferGeneratorProps) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([
    { name: "", description: "", price: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [advisor, setAdvisor] = useState<AdvisorInfo | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data: adv } = await supabase
        .from("advisors")
        .select("company_name, email, phone, first_name, last_name, logo_url, brand_color_primary")
        .single();
      if (adv) setAdvisor(adv);

      if (clientId) {
        const { data: cl } = await supabase
          .from("clients")
          .select("first_name, last_name, email, phone, address")
          .eq("id", clientId)
          .single();
        if (cl) setClient(cl);
      }
    }
    load();
  }, [open, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  function addProduct() {
    setProducts([...products, { name: "", description: "", price: 0 }]);
  }

  function removeProduct(index: number) {
    setProducts(products.filter((_, i) => i !== index));
  }

  function updateProduct(index: number, field: keyof ProductRow, value: string | number) {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  }

  const total = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  function generateOfferNumber() {
    const now = new Date();
    return `NAB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function handleGenerate() {
    if (!title) {
      toast.error("Vyplňte název nabídky.");
      return;
    }
    if (products.length === 0 || !products[0].name) {
      toast.error("Přidejte alespoň jeden produkt.");
      return;
    }

    const offerNumber = generateOfferNumber();
    const today = new Date().toLocaleDateString("cs-CZ");

    const brandColor = advisor?.brand_color_primary || "#2563EB";
    const companyDisplay = advisor?.company_name || `${advisor?.first_name || ""} ${advisor?.last_name || ""}`;
    const logoHtml = advisor?.logo_url
      ? `<img src="${advisor.logo_url}" alt="${companyDisplay}" style="max-height:48px;max-width:200px" />`
      : `<div class="company">${companyDisplay}</div>`;

    const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; padding-bottom: 20px; }
    .header-line { height: 3px; background: ${brandColor}; margin-bottom: 40px; border-radius: 2px; }
    .company { font-size: 20px; font-weight: 700; color: ${brandColor}; }
    .meta { text-align: right; font-size: 13px; color: #64748b; }
    .meta strong { color: #1e293b; }
    h1 { font-size: 24px; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; }
    .client-info { background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-weight: 700; font-size: 16px; background: #eff6ff; }
    .notes { background: #fffbeb; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    .footer-line { height: 3px; background: ${brandColor}; margin-top: 40px; margin-bottom: 16px; border-radius: 2px; }
    .footer { padding-top: 0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
    </div>
    <div class="meta">
      <div class="company" style="margin-bottom:4px">${companyDisplay}</div>
      <div>Číslo nabídky: <strong>${offerNumber}</strong></div>
      <div>Datum: <strong>${today}</strong></div>
      ${validUntil ? `<div>Platnost do: <strong>${new Date(validUntil).toLocaleDateString("cs-CZ")}</strong></div>` : ""}
    </div>
  </div>
  <div class="header-line"></div>

  <h1>${title}</h1>

  ${client ? `
  <div class="section">
    <div class="section-title">Klient</div>
    <div class="client-info">
      <strong>${client.first_name} ${client.last_name}</strong><br>
      ${client.email ? client.email + "<br>" : ""}
      ${client.phone ? client.phone + "<br>" : ""}
      ${client.address ? client.address : ""}
    </div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Produkty a služby</div>
    <table>
      <thead>
        <tr>
          <th>Název</th>
          <th>Popis</th>
          <th style="text-align:right">Cena</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .filter((p) => p.name)
          .map(
            (p) => `<tr>
          <td>${p.name}</td>
          <td style="color:#64748b">${p.description}</td>
          <td style="text-align:right">${Number(p.price).toLocaleString("cs-CZ")} Kč</td>
        </tr>`
          )
          .join("")}
        <tr class="total-row">
          <td colspan="2">Celkem</td>
          <td style="text-align:right">${total.toLocaleString("cs-CZ")} Kč</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${notes ? `
  <div class="section">
    <div class="section-title">Poznámky a podmínky</div>
    <div class="notes">${notes}</div>
  </div>` : ""}

  <div class="footer-line"></div>
  <div class="footer">
    ${companyDisplay} | ${advisor?.email || ""} ${advisor?.phone ? "| " + advisor.phone : ""}
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
    toast.success("Nabídka vygenerována.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vytvořit nabídku
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Název nabídky *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Nabídka pojištění"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs">Produkty a služby</Label>
              <Button variant="outline" size="sm" onClick={addProduct}>
                <Plus className="mr-1 h-3 w-3" />
                Přidat
              </Button>
            </div>
            <div className="space-y-3">
              {products.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Název"
                      value={p.name}
                      onChange={(e) => updateProduct(i, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Popis"
                      value={p.description}
                      onChange={(e) =>
                        updateProduct(i, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Cena"
                      value={p.price || ""}
                      onChange={(e) =>
                        updateProduct(i, "price", Number(e.target.value))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(i)}
                    disabled={products.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-medium text-slate-700">
              Celkem: {total.toLocaleString("cs-CZ")} Kč
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Poznámky</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Další podmínky, poznámky..."
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Platnost do</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleGenerate}>
            <Printer className="mr-2 h-4 w-4" />
            Generovat a tisknout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
