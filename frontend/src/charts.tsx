import { useEffect, useRef } from "react";
import type { Spectrum, Waveform } from "./types";

function resizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c1220";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, height / 2);
  ctx.lineTo(width - 8, height / 2);
  ctx.stroke();
  ctx.strokeStyle = color;
}

export function WaveformCanvas({ data, color }: { data: Waveform; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = resizeCanvas(canvas);
    if (!ctx) return;
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    drawFrame(ctx, width, height, color);

    const ys = data.y;
    if (ys.length < 2) return;
    const maxAbs = Math.max(1e-6, ...ys.map((v) => Math.abs(v)));
    const pad = 8;
    ctx.beginPath();
    ys.forEach((y, i) => {
      const x = pad + (i / (ys.length - 1)) * (width - pad * 2);
      const ny = height / 2 - (y / maxAbs) * (height / 2 - pad);
      if (i === 0) ctx.moveTo(x, ny);
      else ctx.lineTo(x, ny);
    });
    ctx.stroke();
  }, [data, color]);

  return <canvas ref={ref} className="plot" />;
}

export function SpectrumCanvas({ data, color }: { data: Spectrum; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = resizeCanvas(canvas);
    if (!ctx) return;
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    drawFrame(ctx, width, height, color);

    const mags = data.mag;
    if (mags.length < 2) return;
    const dbs = mags.map((m) => 20 * Math.log10(Math.max(m, 1e-12)));
    const peak = Math.max(...dbs);
    const floor = peak - 80;
    const pad = 8;
    ctx.beginPath();
    dbs.forEach((db, i) => {
      const x = pad + (i / (dbs.length - 1)) * (width - pad * 2);
      const norm = (db - floor) / (peak - floor);
      const y = height - pad - Math.max(0, Math.min(1, norm)) * (height - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color]);

  return <canvas ref={ref} className="plot" />;
}
