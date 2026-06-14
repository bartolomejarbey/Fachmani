"use client";

import { useEffect, useRef } from "react";

/**
 * Self-contained konfetová/particle animace na canvasu — žádná knihovna.
 * Vystřelí barevné particles z bodu (default ~horní třetina), gravitace + rotace + fade.
 * Respektuje prefers-reduced-motion (nic nevykreslí). Mountuje se fullscreen, pointer-events-none.
 *
 * Použití: <ConfettiBurst fire={success} /> — při fire=true se přehraje jednou.
 */
const COLORS = ["#06b6d4", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#a855f7", "#ffffff"];

type Particle = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; size: number; color: string; round: boolean;
};

export default function ConfettiBurst({
  fire,
  durationMs = 2600,
  count = 170,
}: {
  fire: boolean;
  durationMs?: number;
  count?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.scale(dpr, dpr);

    // Dvojitý zdroj: hlavní burst z ~42 % výšky + lehký „rain" shora.
    const origin = { x: vw / 2, y: vh * 0.42 };
    const parts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const fromTop = i % 5 === 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 9;
      parts.push({
        x: fromTop ? Math.random() * vw : origin.x,
        y: fromTop ? -20 - Math.random() * 80 : origin.y,
        vx: fromTop ? (Math.random() - 0.5) * 3 : Math.cos(angle) * speed * (0.6 + Math.random()),
        vy: fromTop ? 2 + Math.random() * 3 : Math.sin(angle) * speed - (4 + Math.random() * 5),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        size: 6 + Math.random() * 9,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.45,
      });
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, vw, vh);
      const fade = t > durationMs - 700 ? Math.max(0, 1 - (t - (durationMs - 700)) / 700) : 1;
      for (const p of parts) {
        p.vy += 0.28; // gravitace
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
        }
        ctx.restore();
      }
      if (t < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, vw, vh);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, durationMs, count]);

  if (!fire) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true" />;
}
