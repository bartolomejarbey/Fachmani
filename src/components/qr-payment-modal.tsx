"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

interface QrPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  variableSymbol?: string;
  iban?: string;
  message?: string;
}

export function QrPaymentModal({ open, onOpenChange, amount, variableSymbol, iban, message }: QrPaymentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const parts = ["SPD*1.0"];
    if (iban) parts.push(`ACC:${iban}`);
    parts.push(`AM:${amount.toFixed(2)}`);
    parts.push("CC:CZK");
    if (variableSymbol) parts.push(`X-VS:${variableSymbol}`);
    if (message) parts.push(`MSG:${message.slice(0, 60)}`);

    const spdString = parts.join("*");

    QRCode.toCanvas(canvasRef.current, spdString, {
      width: 256,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    }).then(() => {
      setDataUrl(canvasRef.current?.toDataURL("image/png") || null);
    });
  }, [open, amount, variableSymbol, iban, message]);

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `platba-${variableSymbol || "qr"}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR kód pro platbu
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <canvas ref={canvasRef} />
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              {new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount)}
            </p>
            {variableSymbol && <p className="text-xs text-slate-500">VS: {variableSymbol}</p>}
          </div>
          <p className="text-xs text-slate-500 text-center">
            Naskenujte QR kód v aplikaci vaší banky
          </p>
          <Button onClick={handleDownload} variant="outline" size="sm" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Stáhnout PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
