"use client";

import { useEffect, useRef } from "react";
import type { AgentId } from "@/lib/types";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The presence at the centre of the screen.
 *
 * The brief asks for light, time and space rather than a face or a robot, and
 * for the picture to answer the voice without a waveform or a light show. So
 * this is one luminous form on a dark field: a ring of fine radial lines whose
 * length follows the voice, around a core that breathes.
 *
 * Each agent bends the same form rather than getting its own picture, which is
 * what keeps four very different parts inside one art direction:
 *
 *   MIRAI     a warm core, lines soft and uneven, like a memory surfacing
 *   EVIDENCE  cool and regular, lines ruled at equal intervals
 *   COUNTER   the ring broken by a single arc cutting the other way
 *   CHRONOS   lines of three lengths, 2030 / 2040 / 2050, branching outward
 *
 * Silence is not stillness: with no voice the form keeps a slow breath, so the
 * screen is never dead. With `prefers-reduced-motion` it holds one frame —
 * still legible, and the agent is still distinguishable by colour and figure.
 */

export interface StageProps {
  /** Who is speaking, or who is about to. */
  agent: AgentId;
  /** 0–1 from the player. 0 when nothing is sounding. */
  level: number;
  /** True while audio is actually playing. */
  active: boolean;
  /** Accessible description; the canvas carries no text. */
  label: string;
}

interface Palette {
  readonly core: string;
  readonly line: string;
  readonly glow: string;
}

const PALETTES: Record<AgentId, Palette> = {
  MIRAI: { core: "#f0d9b5", line: "#e8c89a", glow: "rgba(240, 217, 181, 0.22)" },
  EVIDENCE: { core: "#cfe0e8", line: "#a9c6d4", glow: "rgba(169, 198, 212, 0.18)" },
  COUNTER: { core: "#e8c4c0", line: "#d9a9a4", glow: "rgba(217, 169, 164, 0.18)" },
  CHRONOS: { core: "#cdc9e0", line: "#aaa4c8", glow: "rgba(170, 164, 200, 0.18)" },
};

const RAY_COUNT = 144;

/** How far a ray reaches, before the voice is added. 0–1 of the gap. */
function restLength(agent: AgentId, index: number, phase: number): number {
  const angle = (index / RAY_COUNT) * Math.PI * 2;
  switch (agent) {
    case "EVIDENCE":
      // Ruled at equal intervals: measurement, not expression.
      return index % 3 === 0 ? 0.55 : 0.3;
    case "COUNTER": {
      // One arc cuts the other way, so the figure argues with itself.
      const inCut = angle > Math.PI * 0.72 && angle < Math.PI * 1.08;
      return inCut ? 0.82 : 0.26 + Math.sin(angle * 3 + phase) * 0.05;
    }
    case "CHRONOS": {
      // Three lengths, read as three horizons branching outward.
      const tier = index % 3;
      return 0.3 + tier * 0.17;
    }
    case "MIRAI":
    default:
      // Soft and uneven: a person, not an instrument.
      return 0.38 + Math.sin(angle * 2 + phase) * 0.07 + Math.sin(angle * 5 - phase * 0.6) * 0.03;
  }
}

export function Stage({ agent, level, active, label }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();
  // The animation loop reads these rather than closing over them, so a new
  // level sixty times a second does not tear down and rebuild the loop.
  const inputs = useRef({ agent, level, active });
  useEffect(() => {
    inputs.current = { agent, level, active };
  }, [agent, level, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let phase = 0;
    // The level is eased here rather than in the player: the meter updates at
    // animation rate already, and a sudden jump reads as a flicker.
    let eased = 0;
    let disposed = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      return box;
    };

    let box = resize();
    const observer = new ResizeObserver(() => {
      box = resize();
    });
    observer.observe(canvas);

    const draw = () => {
      if (disposed) return;
      const { agent: who, level: raw, active: sounding } = inputs.current;
      const palette = PALETTES[who] ?? PALETTES.MIRAI;

      const width = box.width;
      const height = box.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.5;

      eased += (raw - eased) * 0.18;
      phase += reduced ? 0 : 0.006;
      // Breath, so silence is quiet rather than frozen.
      const breath = reduced ? 0 : Math.sin(phase * 2.1) * 0.5 + 0.5;
      const presence = sounding ? eased : breath * 0.12;

      context.clearRect(0, 0, width, height);

      const inner = radius * (0.3 + presence * 0.04);
      const gap = radius * 0.62 - inner;

      const halo = context.createRadialGradient(cx, cy, inner * 0.2, cx, cy, radius * 0.95);
      halo.addColorStop(0, palette.glow);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = palette.line;
      context.lineWidth = 1;
      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = (i / RAY_COUNT) * Math.PI * 2 - Math.PI / 2;
        const rest = restLength(who, i, phase);
        // The voice lengthens the rays; it does not create them.
        const reach = rest + presence * (0.35 + (i % 7) * 0.02);
        const from = inner;
        const to = inner + gap * Math.min(1.25, reach);
        context.globalAlpha = 0.22 + Math.min(0.5, presence * 0.7) + (i % 3 === 0 ? 0.06 : 0);
        context.beginPath();
        context.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from);
        context.lineTo(cx + Math.cos(angle) * to, cy + Math.sin(angle) * to);
        context.stroke();
      }

      context.globalAlpha = 1;
      context.strokeStyle = palette.core;
      context.lineWidth = 1.25;
      context.beginPath();
      context.arc(cx, cy, inner, 0, Math.PI * 2);
      context.stroke();

      if (!reduced) frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="stage"
      role="img"
      aria-label={label}
    />
  );
}
