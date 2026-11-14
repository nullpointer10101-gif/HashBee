'use client';

import React, { useEffect, useRef } from 'react';
import Image from '@/lib/Image';
import { SafecrackerId, CryptoSymbol } from '@/lib/game-data';
import {
  Face3D,
  createBox3D,
  createCylinderZ3D,
  createGearZ3D,
  transformFaces,
  buildOperative3D,
  renderScene3D,
} from '@/lib/turn3d';

// Pre-allocated 3D Gold Nuggets, Bullion Ingots & Drill Bits for the 4 Tiered Shop Boxes
const SMALL_NUGGET_3D = createBox3D(
  8,
  6,
  7,
  [245, 168, 18],
  0.72,
  0.85,
  0.25,
  'rgba(120, 53, 15, 0.85)'
);

const MEDIUM_GOLD_3D = createBox3D(
  10,
  6,
  8,
  [251, 191, 36],
  0.76,
  0.9,
  0.32,
  'rgba(120, 53, 15, 0.85)'
);

const LARGE_BULLION_3D = createBox3D(
  13,
  6,
  8,
  [250, 204, 21],
  0.78,
  0.95,
  0.38,
  'rgba(120, 53, 15, 0.9)'
);

const BOSS_ROYAL_INGOT_3D = createBox3D(
  15,
  7,
  9,
  [253, 224, 71],
  0.78,
  0.98,
  0.45,
  'rgba(146, 64, 14, 0.92)'
);

const TIER_AUGER_TIP_3D = createCylinderZ3D(
  1.5,
  7.5,
  14,
  10,
  [148, 163, 184],
  [254, 240, 138],
  0.95,
  0.35
);

// Pre-allocated 3D Battery Meshes
const BATTERY_CELL_BODY = createBox3D(28, 36, 22, [8, 51, 68], 0.94, 0.65, 0.1);
const BATTERY_CORE_BAR = createBox3D(22, 8, 24, [34, 211, 238], 0.96, 0.9, 0.75);
const BATTERY_TERMINAL = createBox3D(14, 6, 12, [251, 191, 36], 0.85, 0.85, 0.25);

const PLASMA_TWIN_L = createCylinderZ3D(11, 11, 36, 10, [14, 116, 144], [34, 211, 238], 0.8, 0.45);
const PLASMA_TWIN_R = createCylinderZ3D(11, 11, 36, 10, [217, 119, 6], [251, 191, 36], 0.85, 0.35);
const PLASMA_BRIDGE = createBox3D(30, 8, 12, [30, 41, 59], 0.9, 0.7);

const REACTOR_GEAR = createGearZ3D(22, 28, 10, 12, [217, 119, 6], [251, 191, 36], 0.9);
const REACTOR_CORE = createBox3D(20, 20, 20, [6, 182, 212], 0.85, 0.95, 0.75);
const GOLD_BAR_PROP = createBox3D(14, 6, 9, [251, 191, 36], 0.8, 0.9, 0.25);

interface TierVisualConfig {
  mineImageSrc: string;
  speedMultiplier: number;
  goldCount: number;
  sparkCount: number;
  glowColor: string;
  sparkColors: string[];
  minerFilter: string;
  mineFilter: string;
  mineScale: number;
  minerScale: number;
}

const TIER_CONFIGS: Record<SafecrackerId, TierVisualConfig> = {
  rookie: {
    // 1st Image: Wooden Timber Mine (5,000/day · ≈ $0.05/day · $0.50)
    mineImageSrc: '/assets/aistudio/image_6553642b.png',
    speedMultiplier: 1.0,
    goldCount: 3,
    sparkCount: 8,
    glowColor: 'rgba(251, 191, 36, 0.45)',
    sparkColors: ['#fbbf24', '#f59e0b'],
    minerFilter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.85))',
    mineFilter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.85))',
    mineScale: 1.02,
    minerScale: 0.94,
  },
  specialist: {
    // 2nd Image: Torch & Winch Mine (10,000/day · ≈ $0.10/day · $1.00)
    mineImageSrc: '/assets/aistudio/image_e88ff4fc.png',
    speedMultiplier: 1.35,
    goldCount: 4,
    sparkCount: 12,
    glowColor: 'rgba(251, 191, 36, 0.55)',
    sparkColors: ['#fef08a', '#fbbf24', '#34d399'],
    minerFilter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.85))',
    mineFilter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.85))',
    mineScale: 1.04,
    minerScale: 0.96,
  },
  infiltrator: {
    // 3rd Image: Spiked Blue-Steel Armored Mine (27,500/day · ≈ $0.275/day · $2.50)
    mineImageSrc: '/assets/aistudio/image_9a72a619.png',
    speedMultiplier: 1.75,
    goldCount: 6,
    sparkCount: 16,
    glowColor: 'rgba(251, 191, 36, 0.65)',
    sparkColors: ['#fef08a', '#fbbf24', '#38bdf8'],
    minerFilter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.9))',
    mineFilter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.9))',
    mineScale: 1.05,
    minerScale: 0.98,
  },
  boss: {
    // 4th Image: Max-Level Golden Buttress & Twin Golden Gears Mine (60,000/day · ≈ $0.60/day · $5.00)
    mineImageSrc: '/assets/aistudio/image_91ed81c2.png',
    speedMultiplier: 2.2,
    goldCount: 8,
    sparkCount: 22,
    glowColor: 'rgba(251, 191, 36, 0.8)',
    sparkColors: ['#fef08a', '#fbbf24', '#f59e0b'],
    minerFilter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.9))',
    mineFilter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.9))',
    mineScale: 1.06,
    minerScale: 1.0,
  },
};

export function SafecrackerSprite({
  id,
  className = 'w-full h-full',
  animated = true,
}: {
  id: SafecrackerId;
  className?: string;
  animated?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minerRef = useRef<HTMLDivElement | null>(null);
  const cfg = TIER_CONFIGS[id];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let elapsed = id === 'rookie' ? 0 : id === 'specialist' ? 0.8 : id === 'infiltrator' ? 1.6 : 2.4;

    const STATIC_PITCH = 0.34;
    const STATIC_YAW = -0.46;

    // Create tier-scaled pool of 3D flying gold nuggets/bars coming out of the mine
    const goldParticles = Array.from({ length: cfg.goldCount }, (_, i) => ({
      progress: (i / cfg.goldCount) * 1.0,
      speed: (0.58 + (i % 3) * 0.15) * Math.pow(cfg.speedMultiplier, 0.55),
      arcHeight: 20 + (i % 3) * 9,
      spreadX: -22 - (i % 4) * 9,
      spreadY: 12 - (i % 3) * 10,
      rx: i * 0.8,
      ry: i * 1.2,
      rz: i * 0.5,
    }));

    const sparks = Array.from({ length: cfg.sparkCount }, (_, i) => ({
      x: 96,
      y: 90,
      vx: -25 - Math.random() * 50 * cfg.speedMultiplier,
      vy: -25 - Math.random() * 45 * cfg.speedMultiplier,
      size: 1.2 + Math.random() * 1.7,
      life: (i / cfg.sparkCount) * 1.0,
      color: cfg.sparkColors[i % cfg.sparkColors.length],
    }));

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (animated) {
        elapsed += dt * cfg.speedMultiplier;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Animate the DOM Miner's digging thrust & vibration according to tier speed
      if (minerRef.current && animated) {
        const lungeX = Math.sin(elapsed * 7.2) * (3.2 + cfg.speedMultiplier * 1.1);
        const lungeY = Math.abs(Math.cos(elapsed * 7.2)) * 1.6;
        const vib = Math.sin(elapsed * 38) * (0.4 + cfg.speedMultiplier * 0.3);
        const tilt = Math.sin(elapsed * 7.2) * 1.6;
        minerRef.current.style.transform = `translate3d(${lungeX + vib}px, ${lungeY}px, 0) scale(${cfg.minerScale}) rotate(${tilt}deg)`;
      }

      const contactX = w * 0.55;
      const contactY = h * 0.65;

      // 2. Warm Golden Vein Shockwave & Glow at Mine Mouth (matching main dashboard)
      const pulse = (elapsed * 2.8) % 1;
      ctx.save();
      ctx.beginPath();
      ctx.arc(contactX, contactY, 5 + pulse * 16, 0, Math.PI * 2);
      ctx.strokeStyle = cfg.glowColor;
      ctx.globalAlpha = (1 - pulse) * 0.65;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      const glowGrad = ctx.createRadialGradient(contactX, contactY, 1, contactX, contactY, 20);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(contactX, contactY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Build 3D Faces: Spinning 3D Auger Tip + Tier-Scaled 3D Flying Gold Stream
      const faces: Face3D[] = [];
      const lungeOffset = Math.sin(elapsed * 7.2) * 3.5;

      faces.push(
        ...transformFaces(
          TIER_AUGER_TIP_3D,
          0.2,
          Math.PI / 2 - 0.3,
          elapsed * 16,
          2 + lungeOffset,
          16,
          18
        )
      );

      // 3D Gold Nuggets / Bullion Bars erupting out of the Gold Mine according to plan tier
      const goldMesh =
        id === 'rookie'
          ? SMALL_NUGGET_3D
          : id === 'specialist'
          ? MEDIUM_GOLD_3D
          : id === 'infiltrator'
          ? LARGE_BULLION_3D
          : BOSS_ROYAL_INGOT_3D;

      goldParticles.forEach((g, idx) => {
        if (animated) {
          g.progress += dt * g.speed;
          if (g.progress >= 1) g.progress = 0;
          g.rx += dt * 4.8;
          g.ry += dt * 5.6;
          g.rz += dt * 4.0;
        }

        const t = g.progress;
        // Start right inside the Gold Mine tunnel mouth
        const startX = 16;
        const startY = 14;
        const startZ = 16;

        const curX = startX + g.spreadX * t;
        const curY = startY + g.spreadY * t - Math.sin(t * Math.PI) * g.arcHeight;
        const curZ = startZ + 18 * t;

        const meshToUse = idx % 2 === 0 ? goldMesh : MEDIUM_GOLD_3D;
        faces.push(...transformFaces(meshToUse, g.rx, g.ry, g.rz, curX, curY, curZ));
      });

      renderScene3D(ctx, faces, STATIC_PITCH, STATIC_YAW, w * 0.52, h * 0.55, 0.9, 420);

      // 4. Drilling Sparks Erupting from Mine Contact Point
      sparks.forEach((sp) => {
        if (animated) {
          sp.life += dt * 2.0;
          if (sp.life >= 1) {
            sp.x = contactX + (Math.random() - 0.5) * 6;
            sp.y = contactY + (Math.random() - 0.5) * 6;
            sp.vx = -20 - Math.random() * 42 * cfg.speedMultiplier;
            sp.vy = -28 - Math.random() * 40 * cfg.speedMultiplier;
            sp.life = 0;
          } else {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 165 * dt;
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - sp.life);
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (animated) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [id, animated, cfg]);

  return (
    <div className={`relative select-none overflow-hidden ${className}`}>
      {/* Static Transparent-Cutout Gold Mine on the Right of the Shop Box */}
      <div
        className="absolute right-[-2px] bottom-[6px] w-[104px] h-[104px] flex items-center justify-center pointer-events-none"
        style={{
          filter: cfg.mineFilter,
          transform: `scale(${cfg.mineScale})`,
        }}
      >
        <Image
          src={cfg.mineImageSrc}
          alt={`${id} Gold Mine`}
          width={108}
          height={108}
          quality={95}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Digging Human Miner on the Left of the Shop Box */}
      <div
        ref={minerRef}
        className="absolute left-[2px] bottom-[4px] w-[92px] h-[92px] flex items-center justify-center pointer-events-none will-change-transform"
        style={{
          filter: cfg.minerFilter,
        }}
      >
        <Image
          src="/assets/aistudio/image_40be1902.png"
          alt={id}
          width={96}
          height={96}
          quality={95}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Foreground 60FPS 3D Extraction Canvas (3D Auger & Tiered 3D Gold Eruption) */}
      <canvas
        ref={canvasRef}
        width={176}
        height={144}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
    </div>
  );
}

export function BatterySprite({
  id,
  className = 'w-16 h-16',
}: {
  id: 'pack' | 'plasma' | 'reactor' | 'grid';
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0.5;

    const draw = () => {
      ctx.clearRect(0, 0, 96, 96);
      const faces: Face3D[] = [];

      if (id === 'pack' || id === 'grid') {
        faces.push(...transformFaces(BATTERY_CELL_BODY, 0, angle * 0.5, 0, 0, 4, 0));
        faces.push(...transformFaces(BATTERY_CORE_BAR, 0, angle * 0.5, 0, 0, -4, 0));
        faces.push(...transformFaces(BATTERY_CORE_BAR, 0, angle * 0.5, 0, 0, 10, 0));
        faces.push(...transformFaces(BATTERY_TERMINAL, 0, angle * 0.5, 0, 0, -17, 0));
      } else if (id === 'plasma') {
        faces.push(...transformFaces(PLASMA_TWIN_L, Math.PI / 2, 0, angle * 0.4, -12, 2, 0));
        faces.push(...transformFaces(PLASMA_TWIN_R, Math.PI / 2, 0, -angle * 0.4, 12, 2, 0));
        faces.push(...transformFaces(PLASMA_BRIDGE, 0, angle * 0.4, 0, 0, -16, 0));
      } else {
        faces.push(...transformFaces(REACTOR_GEAR, 0.4, angle * 0.9, angle, 0, 0, 0));
        faces.push(...transformFaces(REACTOR_CORE, -angle, angle * 0.7, 0, 0, 0, 0));
      }

      renderScene3D(ctx, faces, 0.36, -0.48, 48, 50, 1.15, 420);

      angle += 0.025;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [id]);

  return <canvas ref={canvasRef} width={96} height={96} className={className} />;
}

export function SafeLootIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <polygon points="22,26 38,34 22,42 6,34" fill="#fde047" stroke="#78350f" strokeWidth="1.2" />
      <polygon points="6,34 22,42 22,52 6,44" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
      <polygon points="22,42 38,34 38,44 22,52" fill="#b45309" stroke="#78350f" strokeWidth="1.2" />

      <polygon points="42,26 58,34 42,42 26,34" fill="#fde047" stroke="#78350f" strokeWidth="1.2" />
      <polygon points="26,34 42,42 42,52 26,44" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
      <polygon points="42,42 58,34 58,44 42,52" fill="#b45309" stroke="#78350f" strokeWidth="1.2" />

      <polygon points="32,12 48,20 32,28 16,20" fill="#fef08a" stroke="#78350f" strokeWidth="1.3" />
      <polygon points="16,20 32,28 32,38 16,30" fill="#fbbf24" stroke="#78350f" strokeWidth="1.3" />
      <polygon points="32,28 48,20 48,30 32,38" fill="#d97706" stroke="#78350f" strokeWidth="1.3" />
    </svg>
  );
}

export function CryptoCoinBadge({ symbol, className = 'w-8 h-8' }: { symbol: CryptoSymbol; className?: string }) {
  if (symbol === 'GRAM') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <circle cx="20" cy="20" r="19" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
        <path d="M12 14 L28 14 L20 29 Z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
        <line x1="20" y1="14" x2="20" y2="28" stroke="#fff" strokeWidth="2" />
      </svg>
    );
  }
  if (symbol === 'USDT') {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none">
        <circle cx="20" cy="20" r="19" fill="#0d9488" stroke="#2dd4bf" strokeWidth="1.5" />
        <path d="M12 13 H28 M20 13 V29" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="20" cy="19" rx="9" ry="3.2" stroke="#fff" strokeWidth="1.8" fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <circle cx="20" cy="20" r="19" fill="#dc2626" stroke="#f87171" strokeWidth="1.5" />
      <polygon points="11,12 29,15 21,30" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <line x1="11" y1="12" x2="22" y2="20" stroke="#fff" strokeWidth="1.6" />
      <line x1="29" y1="15" x2="22" y2="20" stroke="#fff" strokeWidth="1.6" />
      <line x1="21" y1="30" x2="22" y2="20" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

export function SyndicateHeroIllustration({ className = 'w-52 h-32' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, 220, 128);
      const faces: Face3D[] = [];

      faces.push(...transformFaces(REACTOR_GEAR, 0, 0, phase * 0.7, 0, 2, -12));
      faces.push(...transformFaces(GOLD_BAR_PROP, 0.2, phase, 0, 0, 4, 10));

      const leftOp = buildOperative3D('specialist', phase, phase * 2);
      faces.push(...transformFaces(leftOp, 0, 0.48, 0, -52, 4, 8));

      const rightOp = buildOperative3D('boss', phase + 1.5, phase * 2);
      faces.push(...transformFaces(rightOp, 0, -0.48, 0, 52, 4, 8));

      renderScene3D(ctx, faces, 0.24, 0, 110, 66, 1.15, 480);

      phase += 0.028;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={220} height={128} className={className} />;
}
