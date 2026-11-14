'use client';

import React, { useEffect, useRef } from 'react';
import Image from '@/lib/Image';
import { SafecrackerId, GOLD_TO_USD_RATE, MIN_SMELT_GOLD } from '@/lib/game-data';
import { SafeLootIcon } from './CyberSprites';
import {
  Face3D,
  createBox3D,
  createCylinderZ3D,
  transformFaces,
  renderScene3D,
  rotatePoint3D,
} from '@/lib/turn3d';

interface HeistArenaProps {
  vaultGold: number;
  crewCounts: Record<SafecrackerId, number>;
  powerKwh: number;
  dailyGoldRate: number;
}

// Pre-build 3D Gold Nuggets, Ingots, and Spinning Auger Tip for 60fps zero-lag extraction
const GOLD_NUGGET_3D: Face3D[] = createBox3D(
  11,
  9,
  10,
  [251, 191, 36],
  0.72,
  0.9,
  0.35,
  'rgba(120, 53, 15, 0.85)'
);

const GOLD_INGOT_3D: Face3D[] = createBox3D(
  16,
  7,
  10,
  [250, 204, 21],
  0.76,
  0.95,
  0.3,
  'rgba(120, 53, 15, 0.9)'
);

const AUGER_TIP_3D: Face3D[] = createCylinderZ3D(
  2,
  10,
  18,
  8,
  [148, 163, 184],
  [254, 240, 138],
  0.95,
  0.35
);

// Static isometric camera angle (Gold Mine is 100% static)
const STATIC_PITCH = 0.34;
const STATIC_YAW = -0.46;

// Pre-project static 3D rails once at module load for zero per-frame CPU overhead on mobile
const STATIC_RAIL_FACES: Face3D[] = (() => {
  const tie = createBox3D(8, 3, 28, [92, 58, 33], 0.95, 0.2);
  const faces: Face3D[] = [];
  for (let t = -3; t <= 2; t++) {
    faces.push(...transformFaces(tie, 0, 0, 0, t * 22, 52, 18));
  }
  return faces;
})();

// Pre-compute static isometric floor grid lines once at module load
const STATIC_GRID_LINES = (() => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let g = -140; g <= 140; g += 35) {
    const p1 = rotatePoint3D({ x: g, y: 56, z: -110 }, STATIC_PITCH, STATIC_YAW, 0);
    const p2 = rotatePoint3D({ x: g, y: 56, z: 110 }, STATIC_PITCH, STATIC_YAW, 0);
    lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });

    const p3 = rotatePoint3D({ x: -140, y: 56, z: g }, STATIC_PITCH, STATIC_YAW, 0);
    const p4 = rotatePoint3D({ x: 140, y: 56, z: g }, STATIC_PITCH, STATIC_YAW, 0);
    lines.push({ x1: p3.x, y1: p3.y, x2: p4.x, y2: p4.y });
  }
  return lines;
})();

// Pre-computed 3D Gold Bullion slots stacked on the Gold Mountain behind the Miner
const MOUNTAIN_INGOT_SLOTS = [
  // Base Tier (5% - 35%)
  { threshold: 0.05, x: -92, y: 42, z: -24, rx: 0.1, ry: 0.3, rz: -0.15, isIngot: true },
  { threshold: 0.13, x: -66, y: 44, z: -20, rx: 0.2, ry: -0.4, rz: 0.1, isIngot: false },
  { threshold: 0.21, x: -42, y: 43, z: -22, rx: -0.1, ry: 0.5, rz: 0.05, isIngot: true },
  { threshold: 0.29, x: -108, y: 45, z: -16, rx: 0.05, ry: 0.6, rz: 0.2, isIngot: false },
  // Mid Tier (35% - 70%)
  { threshold: 0.38, x: -82, y: 28, z: -26, rx: -0.15, ry: 0.25, rz: 0.18, isIngot: true },
  { threshold: 0.47, x: -54, y: 26, z: -26, rx: 0.1, ry: -0.35, rz: -0.1, isIngot: true },
  { threshold: 0.56, x: -98, y: 31, z: -22, rx: -0.2, ry: 0.15, rz: -0.22, isIngot: true },
  { threshold: 0.65, x: -72, y: 12, z: -28, rx: 0.08, ry: 0.3, rz: -0.14, isIngot: true },
  // Summit Tier (70% - 100%)
  { threshold: 0.75, x: -48, y: 10, z: -28, rx: -0.12, ry: -0.25, rz: 0.16, isIngot: true },
  { threshold: 0.85, x: -64, y: -6, z: -30, rx: 0.1, ry: -0.3, rz: 0.05, isIngot: true },
  { threshold: 0.94, x: -55, y: -20, z: -32, rx: 0.2, ry: 0.1, rz: 0.15, isIngot: true },
];

export default function HeistArena({
  vaultGold,
  crewCounts,
  powerKwh,
  dailyGoldRate,
}: HeistArenaProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minerDomRef = useRef<HTMLDivElement | null>(null);
  const vaultGoldRef = useRef<number>(vaultGold);

  useEffect(() => {
    vaultGoldRef.current = vaultGold;
  }, [vaultGold]);

  const isPowerOnline = powerKwh > 0;

  const totalCrew =
    (crewCounts.rookie || 0) +
    (crewCounts.specialist || 0) +
    (crewCounts.infiltrator || 0) +
    (crewCounts.boss || 0);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d', { alpha: true });
    const fgCtx = fgCanvas.getContext('2d', { alpha: true });
    if (!bgCtx || !fgCtx) return;

    let animId: number;
    let lastTime = performance.now();
    let elapsed = 0;
    let smoothMountainRatio = Math.max(0, Math.min(1.15, vaultGoldRef.current / MIN_SMELT_GOLD));

    // Pool of 3D tumbling Gold Nuggets & Bars extracted from the Gold Mine
    const flyingGold = Array.from({ length: 5 }, (_, i) => ({
      progress: (i / 5) * 1.0,
      speed: 0.58 + (i % 3) * 0.14,
      arcHeight: 36 + (i % 3) * 12,
      targetType: i % 2 === 0 ? ('mountain' as const) : ('cart' as const),
      rx: i * 0.7,
      ry: i * 1.1,
      rz: i * 0.5,
    }));

    // Lightweight pool of drilling sparks (no shadowBlur for locked 60fps on mobile)
    const drillSparks = Array.from({ length: 14 }, (_, i) => ({
      x: 248,
      y: 152,
      vx: -40 - Math.random() * 80,
      vy: -35 - Math.random() * 70,
      size: 1.8 + Math.random() * 2.0,
      life: (i / 14) * 1.0,
      color: i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fbbf24' : '#f59e0b',
    }));

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isPowerOnline) {
        elapsed += dt;
      }

      // Smoothly interpolate Gold Mountain height toward (vaultGold / MIN_SMELT_GOLD)
      // When user claims/smelts gold, vaultGold becomes 0 -> mountain rapidly drains & disappears
      const liveGold = vaultGoldRef.current;
      const targetRatio = liveGold < 2 ? 0 : Math.max(0, Math.min(1.15, liveGold / MIN_SMELT_GOLD));
      smoothMountainRatio += (targetRatio - smoothMountainRatio) * Math.min(1, dt * 9);
      if (smoothMountainRatio < 0.008 && targetRatio === 0) {
        smoothMountainRatio = 0;
      }

      const w = bgCanvas.width;
      const h = bgCanvas.height;
      bgCtx.clearRect(0, 0, w, h);
      fgCtx.clearRect(0, 0, w, h);

      // Animate the DOM Human Miner's digging thrust & drill vibration smoothly at 60fps
      if (minerDomRef.current) {
        if (isPowerOnline) {
          const lungeX = Math.sin(elapsed * 7.5) * 6.0;
          const lungeY = Math.abs(Math.cos(elapsed * 7.5)) * 2.2;
          const jitter = Math.sin(elapsed * 40) * 0.9;
          const tilt = Math.sin(elapsed * 7.5) * 2.0;
          minerDomRef.current.style.transform = `translate3d(${lungeX + jitter}px, ${lungeY}px, 0) rotate(${tilt}deg)`;
        } else {
          minerDomRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
        }
      }

      // 1. Background 3D Cavern Isometric Floor Grid
      const centerX = w * 0.54;
      const centerY = h * 0.56;

      bgCtx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      bgCtx.lineWidth = 1;
      bgCtx.beginPath();
      for (let i = 0; i < STATIC_GRID_LINES.length; i++) {
        const ln = STATIC_GRID_LINES[i];
        bgCtx.moveTo(centerX + ln.x1, centerY + ln.y1);
        bgCtx.lineTo(centerX + ln.x2, centerY + ln.y2);
      }
      bgCtx.stroke();

      // 2. DYNAMIC 3D GOLD MOUNTAIN IN THE BACKGROUND OF THE MINER
      // Scales directly with smelt progress (0% = empty/disappears, low % = low mound, 100% = tall mountain)
      if (smoothMountainRatio > 0.008) {
        const clampedRatio = Math.min(1.12, smoothMountainRatio);
        const baseFloorY = 216;
        // Mountain height scales from 14px up to 132px behind the Miner
        const mainPeakH = 14 + clampedRatio * 118;
        const leftPeakH = mainPeakH * 0.75;
        const rightPeakH = mainPeakH * 0.68;

        const spreadBonus = clampedRatio * 22;
        const leftBaseX = 18 - spreadBonus * 0.35;
        const rightBaseX = 228 + spreadBonus * 0.6;

        const leftPeakX = 68;
        const leftPeakY = baseFloorY - leftPeakH;

        const mainPeakX = 140;
        const mainPeakY = baseFloorY - mainPeakH;

        const rightPeakX = 198;
        const rightPeakY = baseFloorY - rightPeakH;

        bgCtx.save();

        // A. Radiant Golden Hoard Aura behind the Mountain
        const auraGrad = bgCtx.createRadialGradient(
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          6,
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          42 + clampedRatio * 68
        );
        auraGrad.addColorStop(0, `rgba(251, 191, 36, ${0.2 + clampedRatio * 0.26})`);
        auraGrad.addColorStop(0.55, `rgba(217, 119, 6, ${0.09 + clampedRatio * 0.13})`);
        auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        bgCtx.fillStyle = auraGrad;
        bgCtx.beginPath();
        bgCtx.arc(
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          42 + clampedRatio * 68,
          0,
          Math.PI * 2
        );
        bgCtx.fill();

        // Sunlit Left Facet Gradient
        const litGrad = bgCtx.createLinearGradient(0, mainPeakY, 0, baseFloorY);
        litGrad.addColorStop(0, '#fef08a');
        litGrad.addColorStop(0.35, '#facc15');
        litGrad.addColorStop(0.75, '#f59e0b');
        litGrad.addColorStop(1, '#b45309');

        // Shaded Right 3D Facet Gradient
        const shadeGrad = bgCtx.createLinearGradient(0, mainPeakY, 0, baseFloorY);
        shadeGrad.addColorStop(0, '#fbbf24');
        shadeGrad.addColorStop(0.4, '#d97706');
        shadeGrad.addColorStop(0.8, '#92400e');
        shadeGrad.addColorStop(1, '#451a03');

        // B. Right Flank Gold Pile
        bgCtx.beginPath();
        bgCtx.moveTo(142, baseFloorY);
        bgCtx.lineTo(rightPeakX, rightPeakY);
        bgCtx.lineTo(rightPeakX + 8, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = litGrad;
        bgCtx.fill();

        bgCtx.beginPath();
        bgCtx.moveTo(rightPeakX, rightPeakY);
        bgCtx.lineTo(rightBaseX, baseFloorY);
        bgCtx.lineTo(rightPeakX + 8, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = shadeGrad;
        bgCtx.fill();

        // C. Left Flank Gold Pile
        bgCtx.beginPath();
        bgCtx.moveTo(leftBaseX, baseFloorY);
        bgCtx.lineTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(leftPeakX + 10, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = litGrad;
        bgCtx.fill();

        bgCtx.beginPath();
        bgCtx.moveTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(128, baseFloorY);
        bgCtx.lineTo(leftPeakX + 10, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = shadeGrad;
        bgCtx.fill();

        // D. Central Towering Gold Mountain Peak (directly behind the Miner)
        const ridgeMidX = mainPeakX + 6;
        bgCtx.beginPath();
        bgCtx.moveTo(54 - spreadBonus * 0.2, baseFloorY);
        bgCtx.lineTo(leftPeakX + 18, leftPeakY + leftPeakH * 0.22);
        bgCtx.lineTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = litGrad;
        bgCtx.fill();

        bgCtx.beginPath();
        bgCtx.moveTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(rightPeakX - 12, rightPeakY + rightPeakH * 0.2);
        bgCtx.lineTo(216 + spreadBonus * 0.4, baseFloorY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = shadeGrad;
        bgCtx.fill();

        // Crisp 3D Ridge Highlights on the Mountain Crests
        bgCtx.strokeStyle = 'rgba(254, 249, 195, 0.78)';
        bgCtx.lineWidth = 1.5;
        bgCtx.beginPath();
        bgCtx.moveTo(leftBaseX, baseFloorY);
        bgCtx.lineTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(leftPeakX + 18, leftPeakY + leftPeakH * 0.22);
        bgCtx.lineTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.stroke();

        // E. Twinkling 4-Point Golden Star Glints on the Mountain
        const glintCount = Math.max(2, Math.floor(clampedRatio * 5));
        for (let s = 0; s < glintCount; s++) {
          const twinkle = Math.max(0, Math.sin(elapsed * 4.5 + s * 1.7));
          if (twinkle > 0.25) {
            const gx = 52 + ((s * 31) % 138);
            const maxGy = baseFloorY - 12;
            const minGy = mainPeakY + 14;
            const gy = maxGy - ((s * 23) % Math.max(12, maxGy - minGy));
            const r = 2.4 + twinkle * 2.8;

            bgCtx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.88})`;
            bgCtx.beginPath();
            bgCtx.moveTo(gx, gy - r);
            bgCtx.lineTo(gx + r * 0.3, gy - r * 0.3);
            bgCtx.lineTo(gx + r, gy);
            bgCtx.lineTo(gx + r * 0.3, gy + r * 0.3);
            bgCtx.lineTo(gx, gy + r);
            bgCtx.lineTo(gx - r * 0.3, gy + r * 0.3);
            bgCtx.lineTo(gx - r, gy);
            bgCtx.lineTo(gx - r * 0.3, gy - r * 0.3);
            bgCtx.closePath();
            bgCtx.fill();
          }
        }

        bgCtx.restore();
      }

      // 3. Render Pre-Computed 3D Rails + Stacked 3D Gold Bullion Ingots on the Mountain
      const bgFaces: Face3D[] = [...STATIC_RAIL_FACES];

      if (smoothMountainRatio > 0.03) {
        for (let i = 0; i < MOUNTAIN_INGOT_SLOTS.length; i++) {
          const slot = MOUNTAIN_INGOT_SLOTS[i];
          if (smoothMountainRatio >= slot.threshold) {
            const scaledY = 48 - (48 - slot.y) * Math.min(1.1, smoothMountainRatio);
            const mesh = slot.isIngot ? GOLD_INGOT_3D : GOLD_NUGGET_3D;
            bgFaces.push(
              ...transformFaces(mesh, slot.rx, slot.ry, slot.rz, slot.x, scaledY, slot.z)
            );
          }
        }
      }

      renderScene3D(bgCtx, bgFaces, STATIC_PITCH, STATIC_YAW, centerX, centerY, 1.0, 540);

      // 4. Foreground 3D Extraction Effects (3D Spinning Auger Tip, 3D Tumbling Gold Bars & Sparks)
      const drillContactX = w * 0.59;
      const drillContactY = h * 0.64;

      if (isPowerOnline) {
        // Pulsing Golden Vein Shockwave at the Mine Extraction Point
        const pulse = (elapsed * 3.2) % 1;
        fgCtx.save();
        fgCtx.beginPath();
        fgCtx.arc(drillContactX, drillContactY, 7 + pulse * 24, 0, Math.PI * 2);
        fgCtx.strokeStyle = `rgba(251, 191, 36, ${(1 - pulse) * 0.6})`;
        fgCtx.lineWidth = 2;
        fgCtx.stroke();

        // Warm Golden Core Glow where the Miner's drill breaches the Gold Mine
        const glowGrad = fgCtx.createRadialGradient(
          drillContactX,
          drillContactY,
          2,
          drillContactX,
          drillContactY,
          30
        );
        glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
        glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        fgCtx.fillStyle = glowGrad;
        fgCtx.beginPath();
        fgCtx.arc(drillContactX, drillContactY, 30, 0, Math.PI * 2);
        fgCtx.fill();
        fgCtx.restore();

        // 3D Tumbling Gold Nuggets & Bullion Bars Erupting from the Mine
        const fgFaces: Face3D[] = [];

        const lungeOffset = Math.sin(elapsed * 7.5) * 4.5;
        fgFaces.push(
          ...transformFaces(
            AUGER_TIP_3D,
            0.2,
            Math.PI / 2 - 0.3,
            elapsed * 18,
            12 + lungeOffset,
            18,
            25
          )
        );

        for (let idx = 0; idx < flyingGold.length; idx++) {
          const g = flyingGold[idx];
          g.progress += dt * g.speed;
          if (g.progress >= 1) {
            g.progress = 0;
          }
          g.rx += dt * 4.5;
          g.ry += dt * 5.2;
          g.rz += dt * 3.8;

          const t = g.progress;
          const startX = 24;
          const startY = 16;
          const startZ = 18;

          const endX = g.targetType === 'mountain' ? -58 - (idx % 3) * 14 : 48 + (idx % 2) * 10;
          const endY =
            g.targetType === 'mountain'
              ? 36 - Math.min(1, smoothMountainRatio) * 42
              : 32;
          const endZ = g.targetType === 'mountain' ? -18 : 32;

          const curX = startX + (endX - startX) * t;
          const curY = startY + (endY - startY) * t - Math.sin(t * Math.PI) * g.arcHeight;
          const curZ = startZ + (endZ - startZ) * t;

          const mesh = idx % 2 === 0 ? GOLD_INGOT_3D : GOLD_NUGGET_3D;
          fgFaces.push(...transformFaces(mesh, g.rx, g.ry, g.rz, curX, curY, curZ));
        }

        renderScene3D(fgCtx, fgFaces, STATIC_PITCH, STATIC_YAW, centerX, centerY, 1.0, 540);

        // Fast hardware-friendly sparks (no shadowBlur for smooth mobile rendering)
        for (let i = 0; i < drillSparks.length; i++) {
          const sp = drillSparks[i];
          sp.life += dt * 2.0;
          if (sp.life >= 1) {
            sp.x = drillContactX + (Math.random() - 0.5) * 10;
            sp.y = drillContactY + (Math.random() - 0.5) * 10;
            sp.vx = -35 - Math.random() * 75;
            sp.vy = -42 - Math.random() * 65;
            sp.life = 0;
          } else {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 200 * dt;
          }

          fgCtx.globalAlpha = Math.max(0, 1 - sp.life);
          fgCtx.fillStyle = sp.color;
          fgCtx.beginPath();
          fgCtx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          fgCtx.fill();
        }
        fgCtx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPowerOnline]);

  const usdEquivalent = (vaultGold * GOLD_TO_USD_RATE).toFixed(4);
  const mountainPct = Math.min(100, Math.floor((vaultGold / MIN_SMELT_GOLD) * 100));

  return (
    <div className="relative w-full h-[246px] rounded-2xl overflow-hidden border border-[#26353d] bg-[#080c0f] select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.7)]">
      {/* 1. Deep Atmospheric Underground Gold Mine Cavern Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 72% 54%, rgba(245, 158, 11, 0.24) 0%, rgba(217, 119, 6, 0.1) 38%, rgba(8, 12, 15, 0.98) 78%), linear-gradient(180deg, #070a0d 0%, #10181f 62%, #0b1014 62%, #06080a 100%)',
        }}
      />

      {/* Cavern Rock Silhouettes & Golden Ore Veins in Background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
        viewBox="0 0 408 246"
        preserveAspectRatio="none"
      >
        {/* Mine Timber Support Frame */}
        <path d="M 18 0 L 18 165 M 390 0 L 390 165 M 0 14 L 408 14" stroke="#292524" strokeWidth="6" />
        {/* Glowing Gold Ore Veins in Cavern Wall */}
        <path
          d="M 145 38 L 168 52 L 185 46 L 204 62"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.5"
          fill="none"
        />
        <path
          d="M 320 26 L 348 44 L 366 38"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.6"
          fill="none"
        />
        {/* Ground Horizon Divider */}
        <line x1="0" y1="158" x2="408" y2="158" stroke="#1e293b" strokeWidth="2" />
      </svg>

      {/* 2. Background 3D Canvas (3D Gold Mountain Behind Miner + Isometric Floor & Rails) */}
      <canvas
        ref={bgCanvasRef}
        width={408}
        height={246}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 3. Static Gold Mine + Animated Digging Human Miner (Compressed & Hardware-Accelerated) */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {/* STATIC GOLD MINE (Anchored firmly on the right side of the stage, facing left toward the Miner) */}
        <div className="absolute right-[6px] bottom-[16px] w-[190px] h-[190px] flex items-center justify-center">
          {/* Ambient 3D Golden Furnace Glow inside the Mine Entrance */}
          <div
            className="absolute inset-5 rounded-full opacity-50"
            style={{
              background: isPowerOnline
                ? 'radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 72%)'
                : 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 72%)',
            }}
          />
          <Image
            src="/assets/aistudio/image_6512678f.png"
            alt="Static 3D Gold Mine"
            width={190}
            height={188}
            priority
            quality={75}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none"
            style={{
              transform: 'scaleX(-1)',
            }}
          />
        </div>

        {/* ANIMATED HUMAN MINER (Positioned clearly below the compact top-left badge so never hidden on phones) */}
        <div
          ref={minerDomRef}
          className="absolute left-[88px] bottom-[8px] w-[144px] h-[144px] flex items-center justify-center will-change-transform"
        >
          <Image
            src="/assets/aistudio/image_40be1902.png"
            alt="Human Miner Extracting Gold"
            width={144}
            height={142}
            priority
            quality={75}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none"
          />
        </div>
      </div>

      {/* 4. Foreground 60FPS 3D Canvas (3D Spinning Auger Tip, 3D Tumbling Gold Bars & Drilling Sparks) */}
      <canvas
        ref={fgCanvasRef}
        width={408}
        height={246}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* 5. Compact Mobile-Friendly Top-Left Safe Loot Badge ("IN THE SAFE" — never hides the Miner) */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#0d1316]/90 border border-[#f59e0b]/40 shadow-[0_4px_14px_rgba(0,0,0,0.65)] pointer-events-none">
        <div className="w-6 h-6 rounded-lg bg-[#070a0c] border border-[#f59e0b]/45 flex items-center justify-center shrink-0">
          <SafeLootIcon className="w-5 h-5" />
        </div>
        <div className="pr-0.5 leading-tight">
          <div className="text-[8px] font-extrabold tracking-wider uppercase text-[#94a3b8] leading-none">
            IN THE SAFE
          </div>
          <div
            className="text-xs font-extrabold text-white leading-none mt-0.5 tabular-nums tracking-tight"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            {Math.floor(vaultGold).toLocaleString()}{' '}
            <span className="text-[9px] font-extrabold text-[#fbbf24]">GOLD</span>
          </div>
          <div
            className="text-[9px] font-bold text-[#10b981] leading-none mt-0.5 tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            ≈ ${usdEquivalent} USD
          </div>
        </div>
      </div>

      {/* 6. Bottom-Left Live Extraction Status Pill + Gold Mountain Level Readout */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#090d10]/90 border border-[#1e292d] text-[9px] font-semibold text-[#94a3b8]">
          {isPowerOnline ? (
            <span
              className="text-[#fbbf24] font-bold tabular-nums"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              ⛏️ MINING GOLD · +{(dailyGoldRate / 24).toFixed(0)}/hr ({totalCrew} Crew)
            </span>
          ) : (
            <span className="text-[#ef4444] font-bold">⚠️ POWER DEPLETED — MINER HALTED</span>
          )}
        </div>

        {mountainPct > 0 && (
          <div
            className="px-2 py-0.5 rounded-lg bg-[#090d10]/90 border border-[#f59e0b]/40 text-[9px] font-extrabold text-[#fde047] tabular-nums shadow"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            🏔️ Gold Pile: {mountainPct}%
          </div>
        )}
      </div>
    </div>
  );
}
