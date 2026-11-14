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
  11,
  20,
  10,
  [148, 163, 184],
  [254, 240, 138],
  0.95,
  0.35
);

const RAIL_TIE_3D: Face3D[] = createBox3D(8, 3, 28, [92, 58, 33], 0.95, 0.2);

// Pre-computed 3D Gold Bullion slots stacked on the Gold Mountain behind the Miner
const MOUNTAIN_INGOT_SLOTS = [
  // Base Tier (5% - 30%)
  { threshold: 0.04, x: -95, y: 42, z: -24, rx: 0.1, ry: 0.3, rz: -0.15, isIngot: true },
  { threshold: 0.09, x: -72, y: 44, z: -20, rx: 0.2, ry: -0.4, rz: 0.1, isIngot: false },
  { threshold: 0.14, x: -48, y: 43, z: -22, rx: -0.1, ry: 0.5, rz: 0.05, isIngot: true },
  { threshold: 0.19, x: -24, y: 44, z: -20, rx: 0.15, ry: -0.2, rz: -0.12, isIngot: true },
  { threshold: 0.25, x: -112, y: 45, z: -16, rx: 0.05, ry: 0.6, rz: 0.2, isIngot: false },
  // Mid-Low Tier (30% - 55%)
  { threshold: 0.31, x: -84, y: 28, z: -26, rx: -0.15, ry: 0.25, rz: 0.18, isIngot: true },
  { threshold: 0.37, x: -58, y: 26, z: -26, rx: 0.1, ry: -0.35, rz: -0.1, isIngot: true },
  { threshold: 0.43, x: -34, y: 29, z: -24, rx: 0.25, ry: 0.4, rz: 0.12, isIngot: false },
  { threshold: 0.49, x: -102, y: 31, z: -22, rx: -0.2, ry: 0.15, rz: -0.22, isIngot: true },
  { threshold: 0.54, x: -16, y: 32, z: -22, rx: 0.12, ry: -0.45, rz: 0.08, isIngot: true },
  // Upper-Mid Tier (55% - 80%)
  { threshold: 0.6, x: -74, y: 12, z: -28, rx: 0.08, ry: 0.3, rz: -0.14, isIngot: true },
  { threshold: 0.66, x: -48, y: 10, z: -28, rx: -0.12, ry: -0.25, rz: 0.16, isIngot: true },
  { threshold: 0.72, x: -90, y: 16, z: -26, rx: 0.18, ry: 0.5, rz: -0.08, isIngot: false },
  { threshold: 0.78, x: -28, y: 15, z: -26, rx: -0.15, ry: 0.2, rz: 0.22, isIngot: true },
  // Summit Tier (80% - 100%)
  { threshold: 0.84, x: -64, y: -6, z: -30, rx: 0.1, ry: -0.3, rz: 0.05, isIngot: true },
  { threshold: 0.9, x: -46, y: -8, z: -30, rx: -0.08, ry: 0.35, rz: -0.12, isIngot: true },
  { threshold: 0.95, x: -55, y: -22, z: -32, rx: 0.2, ry: 0.1, rz: 0.15, isIngot: true },
  { threshold: 0.99, x: -76, y: -14, z: -30, rx: -0.18, ry: -0.4, rz: -0.1, isIngot: false },
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
    const bgCtx = bgCanvas.getContext('2d');
    const fgCtx = fgCanvas.getContext('2d');
    if (!bgCtx || !fgCtx) return;

    let animId: number;
    let lastTime = performance.now();
    let elapsed = 0;
    let smoothMountainRatio = Math.max(0, Math.min(1.15, vaultGoldRef.current / MIN_SMELT_GOLD));

    // Static isometric camera angle (Gold Mine is 100% static!)
    const STATIC_PITCH = 0.34;
    const STATIC_YAW = -0.46;

    // Pool of 3D tumbling Gold Nuggets & Bars extracted from the Gold Mine
    const flyingGold = Array.from({ length: 7 }, (_, i) => ({
      progress: (i / 7) * 1.0,
      speed: 0.55 + (i % 3) * 0.14,
      arcHeight: 38 + (i % 4) * 14,
      targetType: i % 2 === 0 ? ('mountain' as const) : ('cart' as const),
      rx: i * 0.7,
      ry: i * 1.1,
      rz: i * 0.5,
    }));

    // Pool of 3D drilling sparks & rock dust at the mine extraction point
    const drillSparks = Array.from({ length: 24 }, (_, i) => ({
      x: 248,
      y: 148,
      vx: -45 - Math.random() * 85,
      vy: -35 - Math.random() * 75,
      size: 1.6 + Math.random() * 2.5,
      life: (i / 24) * 1.0,
      color: i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fbbf24' : '#f59e0b',
    }));

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isPowerOnline) {
        elapsed += dt;
      }

      // Smoothly interpolate Gold Mountain height toward (vaultGold / MIN_SMELT_GOLD)
      // When user claims/smelts gold, vaultGold becomes 0 -> mountain rapidly drains & disappears!
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
          const lungeX = Math.sin(elapsed * 7.5) * 6.5;
          const lungeY = Math.abs(Math.cos(elapsed * 7.5)) * 2.5;
          const jitter = Math.sin(elapsed * 42) * 1.1;
          const tilt = Math.sin(elapsed * 7.5) * 2.2;
          minerDomRef.current.style.transform = `translate3d(${lungeX + jitter}px, ${lungeY}px, 0) rotate(${tilt}deg)`;
        } else {
          minerDomRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
        }
      }

      // 1. Background 3D Cavern Isometric Floor Grid & Wooden Minecart Tracks
      const centerX = w * 0.54;
      const centerY = h * 0.56;

      bgCtx.save();
      bgCtx.strokeStyle = 'rgba(30, 41, 59, 0.48)';
      bgCtx.lineWidth = 1;
      for (let g = -140; g <= 140; g += 28) {
        const p1 = rotatePoint3D({ x: g, y: 56, z: -110 }, STATIC_PITCH, STATIC_YAW, 0);
        const p2 = rotatePoint3D({ x: g, y: 56, z: 110 }, STATIC_PITCH, STATIC_YAW, 0);
        bgCtx.beginPath();
        bgCtx.moveTo(centerX + p1.x, centerY + p1.y);
        bgCtx.lineTo(centerX + p2.x, centerY + p2.y);
        bgCtx.stroke();

        const p3 = rotatePoint3D({ x: -140, y: 56, z: g }, STATIC_PITCH, STATIC_YAW, 0);
        const p4 = rotatePoint3D({ x: 140, y: 56, z: g }, STATIC_PITCH, STATIC_YAW, 0);
        bgCtx.beginPath();
        bgCtx.moveTo(centerX + p3.x, centerY + p3.y);
        bgCtx.lineTo(centerX + p4.x, centerY + p4.y);
        bgCtx.stroke();
      }
      bgCtx.restore();

      // 2. DYNAMIC 3D GOLD MOUNTAIN IN THE BACKGROUND OF THE MINER
      // Scales directly with smelt progress (0% = empty/disappears, low % = low mound, 100% = tall mountain)
      if (smoothMountainRatio > 0.008) {
        const clampedRatio = Math.min(1.12, smoothMountainRatio);
        const baseFloorY = 216;
        // Mountain height scales from 14px up to 142px behind the Miner
        const mainPeakH = 14 + clampedRatio * 126;
        const leftPeakH = mainPeakH * 0.76;
        const rightPeakH = mainPeakH * 0.68;

        // Horizontal spread also expands as more gold is stored
        const spreadBonus = clampedRatio * 24;
        const leftBaseX = 16 - spreadBonus * 0.35;
        const rightBaseX = 228 + spreadBonus * 0.65;

        const leftPeakX = 64;
        const leftPeakY = baseFloorY - leftPeakH;

        const mainPeakX = 136;
        const mainPeakY = baseFloorY - mainPeakH;

        const rightPeakX = 196;
        const rightPeakY = baseFloorY - rightPeakH;

        bgCtx.save();

        // A. Radiant Golden Hoard Aura behind the Mountain
        const auraGrad = bgCtx.createRadialGradient(
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          6,
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          45 + clampedRatio * 75
        );
        auraGrad.addColorStop(0, `rgba(251, 191, 36, ${0.22 + clampedRatio * 0.28})`);
        auraGrad.addColorStop(0.55, `rgba(217, 119, 6, ${0.1 + clampedRatio * 0.14})`);
        auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        bgCtx.fillStyle = auraGrad;
        bgCtx.beginPath();
        bgCtx.arc(
          mainPeakX,
          baseFloorY - mainPeakH * 0.45,
          45 + clampedRatio * 75,
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

        // B. Right Flank Gold Pile (behind Miner's drill arm)
        bgCtx.beginPath();
        bgCtx.moveTo(140, baseFloorY);
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

        // C. Left Flank Gold Pile (clearly visible to the left of the Miner)
        bgCtx.beginPath();
        bgCtx.moveTo(leftBaseX, baseFloorY);
        bgCtx.lineTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(leftPeakX + 10, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = litGrad;
        bgCtx.fill();

        bgCtx.beginPath();
        bgCtx.moveTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(126, baseFloorY);
        bgCtx.lineTo(leftPeakX + 10, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = shadeGrad;
        bgCtx.fill();

        // D. Central Towering Gold Mountain Peak (directly behind the Miner)
        const ridgeMidX = mainPeakX + 6;
        // Left sunlit face of central peak
        bgCtx.beginPath();
        bgCtx.moveTo(52 - spreadBonus * 0.2, baseFloorY);
        bgCtx.lineTo(leftPeakX + 18, leftPeakY + leftPeakH * 0.22);
        bgCtx.lineTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = litGrad;
        bgCtx.fill();

        // Right shaded 3D face of central peak
        bgCtx.beginPath();
        bgCtx.moveTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(rightPeakX - 12, rightPeakY + rightPeakH * 0.2);
        bgCtx.lineTo(214 + spreadBonus * 0.4, baseFloorY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.closePath();
        bgCtx.fillStyle = shadeGrad;
        bgCtx.fill();

        // Crisp 3D Ridge Highlights on the Mountain Crests
        bgCtx.strokeStyle = 'rgba(254, 249, 195, 0.78)';
        bgCtx.lineWidth = 1.6;
        bgCtx.beginPath();
        bgCtx.moveTo(leftBaseX, baseFloorY);
        bgCtx.lineTo(leftPeakX, leftPeakY);
        bgCtx.lineTo(leftPeakX + 18, leftPeakY + leftPeakH * 0.22);
        bgCtx.lineTo(mainPeakX, mainPeakY);
        bgCtx.lineTo(ridgeMidX, baseFloorY);
        bgCtx.stroke();

        // E. Twinkling 4-Point Golden Star Glints on the Mountain
        const glintCount = Math.max(2, Math.floor(clampedRatio * 7));
        for (let s = 0; s < glintCount; s++) {
          const twinkle = Math.max(0, Math.sin(elapsed * 4.5 + s * 1.7));
          if (twinkle > 0.2) {
            const gx = 46 + ((s * 31) % 145);
            const maxGy = baseFloorY - 12;
            const minGy = mainPeakY + 14;
            const gy = maxGy - ((s * 23) % Math.max(12, maxGy - minGy));
            const r = 2.5 + twinkle * 3.2;

            bgCtx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.9})`;
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

      // 3. Render 3D Rails + Stacked 3D Gold Bullion Ingots on the Mountain
      const bgFaces: Face3D[] = [];
      for (let t = -3; t <= 2; t++) {
        bgFaces.push(...transformFaces(RAIL_TIE_3D, 0, 0, 0, t * 22, 52, 18));
      }

      if (smoothMountainRatio > 0.02) {
        MOUNTAIN_INGOT_SLOTS.forEach((slot) => {
          if (smoothMountainRatio >= slot.threshold) {
            // Scale vertical position with smoothMountainRatio so bars rise with the mountain
            const scaledY = 48 - (48 - slot.y) * Math.min(1.1, smoothMountainRatio);
            const mesh = slot.isIngot ? GOLD_INGOT_3D : GOLD_NUGGET_3D;
            bgFaces.push(
              ...transformFaces(mesh, slot.rx, slot.ry, slot.rz, slot.x, scaledY, slot.z)
            );
          }
        });
      }

      renderScene3D(bgCtx, bgFaces, STATIC_PITCH, STATIC_YAW, centerX, centerY, 1.0, 540);

      // 4. Foreground 3D Extraction Effects (3D Spinning Auger Tip, 3D Tumbling Gold Bars & Sparks)
      const drillContactX = w * 0.59;
      const drillContactY = h * 0.63;

      if (isPowerOnline) {
        // Pulsing Golden Vein Shockwave at the Mine Extraction Point
        const pulse = (elapsed * 3.5) % 1;
        fgCtx.save();
        fgCtx.beginPath();
        fgCtx.arc(drillContactX, drillContactY, 8 + pulse * 26, 0, Math.PI * 2);
        fgCtx.strokeStyle = `rgba(251, 191, 36, ${(1 - pulse) * 0.65})`;
        fgCtx.lineWidth = 2.2;
        fgCtx.stroke();

        // Warm Golden Core Glow where the Miner's drill breaches the Gold Mine
        const glowGrad = fgCtx.createRadialGradient(
          drillContactX,
          drillContactY,
          2,
          drillContactX,
          drillContactY,
          34
        );
        glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        glowGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.4)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        fgCtx.fillStyle = glowGrad;
        fgCtx.beginPath();
        fgCtx.arc(drillContactX, drillContactY, 34, 0, Math.PI * 2);
        fgCtx.fill();
        fgCtx.restore();

        // 3D Tumbling Gold Nuggets & Bullion Bars Erupting from the Mine
        const fgFaces: Face3D[] = [];

        const lungeOffset = Math.sin(elapsed * 7.5) * 5;
        fgFaces.push(
          ...transformFaces(
            AUGER_TIP_3D,
            0.2,
            Math.PI / 2 - 0.3,
            elapsed * 18,
            12 + lungeOffset,
            16,
            25
          )
        );

        flyingGold.forEach((g, idx) => {
          g.progress += dt * g.speed;
          if (g.progress >= 1) {
            g.progress = 0;
          }
          g.rx += dt * 4.5;
          g.ry += dt * 5.2;
          g.rz += dt * 3.8;

          const t = g.progress;
          // Start at the Gold Mine tunnel mouth (X = +24, Y = +14, Z = +18)
          const startX = 24;
          const startY = 14;
          const startZ = 18;

          // Target either the growing Gold Mountain behind the Miner OR the Minecart
          const endX = g.targetType === 'mountain' ? -62 - (idx % 3) * 14 : 48 + (idx % 2) * 10;
          const endY =
            g.targetType === 'mountain'
              ? 36 - Math.min(1, smoothMountainRatio) * 44
              : 32;
          const endZ = g.targetType === 'mountain' ? -18 : 32;

          const curX = startX + (endX - startX) * t;
          const curY =
            startY + (endY - startY) * t - Math.sin(t * Math.PI) * g.arcHeight;
          const curZ = startZ + (endZ - startZ) * t;

          const mesh = idx % 2 === 0 ? GOLD_INGOT_3D : GOLD_NUGGET_3D;
          fgFaces.push(...transformFaces(mesh, g.rx, g.ry, g.rz, curX, curY, curZ));
        });

        renderScene3D(fgCtx, fgFaces, STATIC_PITCH, STATIC_YAW, centerX, centerY, 1.0, 540);

        // Shower of 3D Sparks flying off the spinning drill bit
        drillSparks.forEach((sp) => {
          sp.life += dt * 1.9;
          if (sp.life >= 1) {
            sp.x = drillContactX + (Math.random() - 0.5) * 10;
            sp.y = drillContactY + (Math.random() - 0.5) * 10;
            sp.vx = -35 - Math.random() * 80;
            sp.vy = -45 - Math.random() * 70;
            sp.life = 0;
          } else {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 210 * dt; // gravity
          }

          fgCtx.save();
          fgCtx.globalAlpha = Math.max(0, 1 - sp.life);
          fgCtx.fillStyle = sp.color;
          fgCtx.shadowColor = sp.color;
          fgCtx.shadowBlur = 6;
          fgCtx.beginPath();
          fgCtx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          fgCtx.fill();
          fgCtx.restore();
        });
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

      {/* 3. Static Gold Mine + Animated Digging Human Miner */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {/* STATIC GOLD MINE (Anchored firmly on the right side of the stage, facing left toward the Miner) */}
        <div
          className="absolute right-[6px] bottom-[16px] w-[196px] h-[196px] flex items-center justify-center"
          style={{
            filter: 'drop-shadow(0 14px 18px rgba(0, 0, 0, 0.85))',
          }}
        >
          {/* Ambient 3D Golden Furnace Glow inside the Mine Entrance */}
          <div
            className="absolute inset-4 rounded-full opacity-55 blur-xl"
            style={{
              background: isPowerOnline
                ? 'radial-gradient(circle, rgba(251,191,36,0.65) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)',
            }}
          />
          <Image
            src="/assets/aistudio/image_6512678f.png"
            alt="Static 3D Gold Mine"
            width={200}
            height={197}
            quality={95}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none"
            style={{
              transform: 'scaleX(-1)',
            }}
          />
        </div>

        {/* ANIMATED HUMAN MINER (Positioned in front of the Gold Mountain & Mine, actively digging) */}
        <div
          ref={minerDomRef}
          className="absolute left-[76px] bottom-[12px] w-[162px] h-[162px] flex items-center justify-center will-change-transform"
          style={{
            filter: 'drop-shadow(0 12px 16px rgba(0, 0, 0, 0.85))',
          }}
        >
          <Image
            src="/assets/aistudio/image_40be1902.png"
            alt="Human Miner Extracting Gold"
            width={162}
            height={162}
            quality={95}
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

      {/* 5. Top-Left Floating Safe Loot Card ("IN THE SAFE") */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[#0d1316]/92 border border-[#f59e0b]/40 shadow-[0_8px_24px_rgba(0,0,0,0.75)] pointer-events-none">
        <div className="w-11 h-11 rounded-xl bg-[#070a0c] border border-[#f59e0b]/45 flex items-center justify-center shrink-0">
          <SafeLootIcon className="w-9 h-9" />
        </div>
        <div className="pr-1">
          <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#94a3b8]">
            IN THE SAFE
          </div>
          <div
            className="text-xl font-extrabold text-white leading-none mt-0.5 tabular-nums tracking-tight"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            {Math.floor(vaultGold).toLocaleString()}{' '}
            <span className="text-xs font-extrabold text-[#fbbf24]">GOLD</span>
          </div>
          <div
            className="text-xs font-bold text-[#10b981] mt-1 tabular-nums"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            ≈ ${usdEquivalent} USD
          </div>
        </div>
      </div>

      {/* 6. Bottom-Left Live Extraction Status Pill + Gold Mountain Level Readout */}
      <div className="absolute bottom-2.5 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090d10]/90 border border-[#1e292d] text-[10px] font-semibold text-[#94a3b8]">
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
            className="px-2 py-1 rounded-lg bg-[#090d10]/90 border border-[#f59e0b]/40 text-[10px] font-extrabold text-[#fde047] tabular-nums shadow"
            style={{ fontFamily: 'var(--font-mono), monospace' }}
          >
            🏔️ Gold Pile: {mountainPct}%
          </div>
        )}
      </div>
    </div>
  );
}
