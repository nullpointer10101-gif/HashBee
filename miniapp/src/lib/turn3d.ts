// High-Precision 60FPS 3D Isometric Mechanical & Character Engine
// Supports:
// 1. Static 3D Gold Mine Building (buttresses, iron hoist arch, golden winch gears, tunnel shaft, minecart full of gold)
// 2. Articulated 3D Human Miner (golden hard-hat with crown badge, mustache, orange vest, muscular arms, and giant wooden/iron conical auger drill digging the mine)
// 3. 3D Tumbling Gold Bullion Bars & Nuggets extracted from the mine in real time.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Face3D {
  verts: Vec3[];
  baseColor: [number, number, number];
  strokeColor?: string;
  metallic?: number;
  emissive?: number;
  alpha?: number;
}

export interface ProjectedPoly {
  points: { x: number; y: number }[];
  depth: number;
  fillStyle: string;
  strokeStyle: string;
  alpha: number;
}

export function rotatePoint3D(
  p: Vec3,
  rx: number,
  ry: number,
  rz: number,
  ox = 0,
  oy = 0,
  oz = 0
): Vec3 {
  let x = p.x;
  let y = p.y;
  let z = p.z;

  if (rz !== 0) {
    const cz = Math.cos(rz);
    const sz = Math.sin(rz);
    const nx = x * cz - y * sz;
    const ny = x * sz + y * cz;
    x = nx;
    y = ny;
  }

  if (rx !== 0) {
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const ny = y * cx - z * sx;
    const nz = y * sx + z * cx;
    y = ny;
    z = nz;
  }

  if (ry !== 0) {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const nx = x * cy + z * sy;
    const nz = -x * sy + z * cy;
    x = nx;
    z = nz;
  }

  return { x: x + ox, y: y + oy, z: z + oz };
}

export function computeFaceNormal(verts: Vec3[]): Vec3 {
  if (verts.length < 3) return { x: 0, y: 0, z: 1 };
  const ax = verts[1].x - verts[0].x;
  const ay = verts[1].y - verts[0].y;
  const az = verts[1].z - verts[0].z;

  const bx = verts[2].x - verts[0].x;
  const by = verts[2].y - verts[0].y;
  const bz = verts[2].z - verts[0].z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

const LIGHT_KEY: Vec3 = { x: -0.48, y: -0.64, z: 0.60 };
const LIGHT_RIM: Vec3 = { x: 0.58, y: -0.25, z: 0.77 };

export function shadeColor(
  rgb: [number, number, number],
  normal: Vec3,
  metallic = 0.4,
  emissive = 0
): string {
  if (emissive >= 0.92) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  const dotKey = Math.max(
    0,
    normal.x * LIGHT_KEY.x + normal.y * LIGHT_KEY.y + normal.z * LIGHT_KEY.z
  );
  const dotRim = Math.max(
    0,
    normal.x * LIGHT_RIM.x + normal.y * LIGHT_RIM.y + normal.z * LIGHT_RIM.z
  );

  const ambient = 0.42;
  const diffuse = dotKey * 0.64;
  const spec = Math.pow(dotRim, 4.5) * metallic * 0.5;

  const brightness = Math.min(1.5, ambient + diffuse + emissive * 0.6);

  const r = Math.min(255, Math.max(0, Math.round(rgb[0] * brightness + spec * 255)));
  const g = Math.min(255, Math.max(0, Math.round(rgb[1] * brightness + spec * 238)));
  const b = Math.min(255, Math.max(0, Math.round(rgb[2] * brightness + spec * 195)));

  return `rgb(${r}, ${g}, ${b})`;
}

export function createBox3D(
  w: number,
  h: number,
  d: number,
  color: [number, number, number],
  topScale = 1.0,
  metallic = 0.4,
  emissive = 0,
  strokeColor = 'rgba(8, 12, 16, 0.72)'
): Face3D[] {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const tw = hw * topScale;
  const td = hd * topScale;

  const v: Vec3[] = [
    { x: -tw, y: -hh, z: -td },
    { x: tw, y: -hh, z: -td },
    { x: tw, y: -hh, z: td },
    { x: -tw, y: -hh, z: td },
    { x: -hw, y: hh, z: -hd },
    { x: hw, y: hh, z: -hd },
    { x: hw, y: hh, z: hd },
    { x: -hw, y: hh, z: hd },
  ];

  return [
    { verts: [v[0], v[1], v[2], v[3]], baseColor: color, metallic, emissive, strokeColor },
    { verts: [v[7], v[6], v[5], v[4]], baseColor: color, metallic, emissive, strokeColor },
    { verts: [v[3], v[2], v[6], v[7]], baseColor: color, metallic, emissive, strokeColor },
    { verts: [v[1], v[0], v[4], v[5]], baseColor: color, metallic, emissive, strokeColor },
    { verts: [v[2], v[1], v[5], v[6]], baseColor: color, metallic, emissive, strokeColor },
    { verts: [v[0], v[3], v[7], v[4]], baseColor: color, metallic, emissive, strokeColor },
  ];
}

export function createCylinderZ3D(
  rFront: number,
  rBack: number,
  depth: number,
  segments: number,
  color: [number, number, number],
  capColor: [number, number, number] = color,
  metallic = 0.5,
  emissive = 0,
  strokeColor = 'rgba(8, 12, 16, 0.65)'
): Face3D[] {
  const faces: Face3D[] = [];
  const hz = depth / 2;
  const frontRing: Vec3[] = [];
  const backRing: Vec3[] = [];

  for (let i = 0; i < segments; i++) {
    const a = (i * Math.PI * 2) / segments;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    frontRing.push({ x: ca * rFront, y: sa * rFront, z: hz });
    backRing.push({ x: ca * rBack, y: sa * rBack, z: -hz });
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push({
      verts: [frontRing[i], backRing[i], backRing[next], frontRing[next]],
      baseColor: color,
      metallic,
      emissive,
      strokeColor,
    });
  }

  faces.push({
    verts: frontRing,
    baseColor: capColor,
    metallic: metallic + 0.15,
    emissive,
    strokeColor,
  });
  faces.push({
    verts: [...backRing].reverse(),
    baseColor: capColor,
    metallic,
    emissive,
    strokeColor,
  });

  return faces;
}

export function createGearZ3D(
  innerR: number,
  outerR: number,
  depth: number,
  teeth: number,
  color: [number, number, number],
  faceColor: [number, number, number],
  metallic = 0.65
): Face3D[] {
  const faces: Face3D[] = [];
  const hz = depth / 2;
  const totalSteps = teeth * 2;
  const frontPts: Vec3[] = [];
  const backPts: Vec3[] = [];

  for (let i = 0; i < totalSteps; i++) {
    const a0 = (i * Math.PI * 2) / totalSteps;
    const a1 = ((i + 0.72) * Math.PI * 2) / totalSteps;
    const r = i % 2 === 0 ? outerR : innerR;

    frontPts.push({ x: Math.cos(a0) * r, y: Math.sin(a0) * r, z: hz });
    frontPts.push({ x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: hz });

    backPts.push({ x: Math.cos(a0) * r, y: Math.sin(a0) * r, z: -hz });
    backPts.push({ x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: -hz });
  }

  const n = frontPts.length;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push({
      verts: [frontPts[i], backPts[i], backPts[next], frontPts[next]],
      baseColor: color,
      metallic,
      strokeColor: 'rgba(8, 12, 16, 0.78)',
    });
  }

  faces.push({
    verts: frontPts,
    baseColor: faceColor,
    metallic: metallic + 0.12,
    strokeColor: 'rgba(251, 191, 36, 0.35)',
  });
  faces.push({
    verts: [...backPts].reverse(),
    baseColor: color,
    metallic,
    strokeColor: 'rgba(8, 12, 16, 0.78)',
  });

  return faces;
}

export function transformFaces(
  faces: Face3D[],
  rx: number,
  ry: number,
  rz: number,
  ox: number,
  oy: number,
  oz: number
): Face3D[] {
  return faces.map((f) => ({
    ...f,
    verts: f.verts.map((v) => rotatePoint3D(v, rx, ry, rz, ox, oy, oz)),
  }));
}

// ============================================================================
// 1. STATIC 3D GOLD MINE STRUCTURE (Recreation of image_6512678f.png in 3D)
// ============================================================================
const MINE_CHAMBER_CORE = createBox3D(54, 42, 48, [42, 48, 56], 0.76, 0.5);
const MINE_GOLD_INTERIOR = createBox3D(34, 28, 14, [245, 168, 18], 0.9, 0.85, 0.35);
const MINE_BUTTRESS_GOLD = createBox3D(20, 26, 20, [235, 168, 36], 0.65, 0.75, 0.1);
const MINE_BUTTRESS_IRON = createBox3D(16, 18, 16, [58, 70, 82], 0.75, 0.6);
const MINE_ARCH_SIDE = createBox3D(12, 34, 38, [88, 78, 70], 0.85, 0.55);
const MINE_WINCH_DRUM = createCylinderZ3D(11, 11, 34, 12, [75, 85, 99], [234, 179, 8], 0.7);
const MINE_WINCH_GEAR = createGearZ3D(11, 15, 7, 10, [195, 135, 22], [250, 190, 40], 0.85);
const MINECART_BODY = createBox3D(22, 13, 16, [71, 85, 105], 1.15, 0.65);
const MINECART_GOLD = createBox3D(18, 7, 13, [251, 191, 36], 0.85, 0.9, 0.35);

export function buildStaticGoldMine3D(winchGearAngle: number): Face3D[] {
  const faces: Face3D[] = [];

  // Main Sloped Iron & Stone Mine Vault Body
  faces.push(...transformFaces(MINE_CHAMBER_CORE, 0, 0, 0, 0, 6, 0));

  // Glowing Gold Vein Tunnel Mouth facing the Miner (-X side)
  faces.push(...transformFaces(MINE_GOLD_INTERIOR, 0, 0, 0, -22, 12, 4));

  // 4 Heavy Golden Corner Buttresses + Upper Dark Iron Caps
  const corners = [
    { x: -24, z: 22 },
    { x: 24, z: 22 },
    { x: -24, z: -22 },
    { x: 24, z: -22 },
  ];
  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    faces.push(...transformFaces(MINE_BUTTRESS_GOLD, 0, 0, 0, c.x, 16, c.z));
    faces.push(...transformFaces(MINE_BUTTRESS_IRON, 0, 0, 0, c.x * 0.88, -2, c.z * 0.88));
  }

  // Upper Heavy Riveted Hoist Side Arches
  faces.push(...transformFaces(MINE_ARCH_SIDE, 0, 0, 0, -16, -16, 0));
  faces.push(...transformFaces(MINE_ARCH_SIDE, 0, 0, 0, 16, -16, 0));

  // Top Winch Drum & Twin Golden Cog Gears (Oriented along X axis)
  faces.push(...transformFaces(MINE_WINCH_DRUM, 0, Math.PI / 2, 0, 0, -24, -4));
  faces.push(...transformFaces(MINE_WINCH_GEAR, 0, Math.PI / 2, winchGearAngle, -4, -18, 12));
  faces.push(...transformFaces(MINE_WINCH_GEAR, 0, Math.PI / 2, -winchGearAngle, 8, -18, 12));

  // Overflowing Gold Minecart on Tracks at Tunnel Entrance (-X front)
  faces.push(...transformFaces(MINECART_BODY, 0, 0, 0, -40, 22, 12));
  faces.push(...transformFaces(MINECART_GOLD, 0, 0, 0, -40, 14, 12));

  return faces;
}

// ============================================================================
// 2. ARTICULATED 3D HUMAN MINER DIGGING (Recreation of image_40be1902.png in 3D)
// ============================================================================
const MINER_BOOT = createBox3D(8, 7, 10, [92, 64, 51], 0.9, 0.3);
const MINER_LEG = createBox3D(7.5, 11, 8, [68, 48, 38], 0.95, 0.25);
const MINER_TORSO_VEST = createBox3D(20, 20, 14, [245, 158, 11], 0.92, 0.35);
const MINER_STRAP = createBox3D(4, 20, 15, [120, 68, 38], 0.95, 0.3);
const MINER_ARM = createBox3D(7, 15, 7, [232, 168, 130], 0.9, 0.2);
const MINER_HEAD = createBox3D(15, 14, 14, [235, 172, 134], 0.92, 0.2);
const MINER_MUSTACHE = createBox3D(11, 4.5, 4, [133, 77, 14], 0.85, 0.2);
const MINER_HELMET_BRIM = createCylinderZ3D(12, 12, 4, 12, [245, 158, 11], [251, 191, 36], 0.75, 0.15);
const MINER_HELMET_DOME = createBox3D(16, 9, 16, [234, 150, 12], 0.75, 0.75, 0.1);
const MINER_CROWN_BADGE = createBox3D(7, 6, 3, [253, 224, 71], 0.9, 0.95, 0.35);
const MINER_BACKPACK = createBox3D(14, 16, 9, [51, 65, 85], 0.9, 0.6);

// Giant Wooden-Cased & Iron Conical Auger Drill (held in both hands)
const AUGER_WOOD_BOX = createBox3D(24, 14, 14, [146, 84, 38], 0.96, 0.35);
const AUGER_IRON_COLLAR = createBox3D(6, 16, 16, [71, 85, 105], 0.98, 0.75);
const AUGER_SPIRAL_CONE1 = createCylinderZ3D(5.5, 9.5, 12, 10, [82, 92, 104], [148, 163, 184], 0.85);
const AUGER_SPIRAL_CONE2 = createCylinderZ3D(1.2, 5.5, 12, 10, [148, 163, 184], [254, 240, 138], 0.95, 0.25);

export function buildHumanMinerDigging3D(digPhase: number, augerSpin: number): Face3D[] {
  const faces: Face3D[] = [];

  // Digging lunge & high-frequency drill vibration
  const lungeX = Math.sin(digPhase * 6) * 4.5;
  const bodyBobY = Math.abs(Math.cos(digPhase * 6)) * 2.2;
  const drillJitterY = Math.sin(augerSpin * 3) * 0.9;

  // 1. Boots & Legs planted on cavern floor
  faces.push(...transformFaces(MINER_BOOT, 0, 0, 0, -4, 24, 5));
  faces.push(...transformFaces(MINER_BOOT, 0, 0, 0, 5, 24, -5));
  faces.push(...transformFaces(MINER_LEG, 0, 0, 0, -4, 16, 5));
  faces.push(...transformFaces(MINER_LEG, 0, 0, 0, 5, 16, -5));

  // 2. Torso in Orange Miner Vest + Brown Leather Harness Straps + Backpack
  faces.push(...transformFaces(MINER_TORSO_VEST, 0, 0, -0.1, lungeX * 0.6, 2 + bodyBobY, 0));
  faces.push(...transformFaces(MINER_STRAP, 0, 0, -0.1, lungeX * 0.6 + 4, 2 + bodyBobY, 4));
  faces.push(...transformFaces(MINER_STRAP, 0, 0, -0.1, lungeX * 0.6 + 4, 2 + bodyBobY, -4));
  faces.push(...transformFaces(MINER_BACKPACK, 0, 0, -0.1, lungeX * 0.6 - 11, 1 + bodyBobY, 0));

  // 3. Head, Thick Brown Mustache, and Golden Crowned Hard-Hat
  const hx = lungeX * 0.75 + 2;
  const hy = -14 + bodyBobY;
  faces.push(...transformFaces(MINER_HEAD, 0, 0, 0, hx, hy, 0));
  faces.push(...transformFaces(MINER_MUSTACHE, 0, 0, 0, hx + 7.5, hy + 2.5, 0));
  faces.push(...transformFaces(MINER_HELMET_BRIM, Math.PI / 2, 0, 0, hx, hy - 6, 0));
  faces.push(...transformFaces(MINER_HELMET_DOME, 0, 0, 0, hx, hy - 10, 0));
  faces.push(...transformFaces(MINER_CROWN_BADGE, 0, Math.PI / 2, 0, hx + 8.5, hy - 10, 0));

  // 4. Muscular Arms gripping the Giant Auger Drill
  faces.push(...transformFaces(MINER_ARM, 0.3, 0, -0.45, lungeX + 6, 4 + bodyBobY, 9));
  faces.push(...transformFaces(MINER_ARM, -0.3, 0, -0.55, lungeX + 10, 3 + bodyBobY, -8));

  // 5. Giant Wooden-and-Iron Conical Spiral Auger Drill pointing +X into the Gold Mine
  const dx = lungeX + 20;
  const dy = 7 + bodyBobY + drillJitterY;
  faces.push(...transformFaces(AUGER_WOOD_BOX, 0, 0, 0, dx, dy, 2));
  faces.push(...transformFaces(AUGER_IRON_COLLAR, 0, 0, 0, dx + 12, dy, 2));
  // Conical Auger Bit oriented along +X axis (ry = Math.PI / 2) spinning rapidly
  faces.push(
    ...transformFaces(AUGER_SPIRAL_CONE1, 0, Math.PI / 2, augerSpin, dx + 20, dy, 2)
  );
  faces.push(
    ...transformFaces(AUGER_SPIRAL_CONE2, 0, Math.PI / 2, -augerSpin * 1.5, dx + 31, dy, 2)
  );

  return faces;
}

// Keep buildOperative3D for Shop Cards & Syndicate Diorama
export function buildOperative3D(
  role: 'rookie' | 'specialist' | 'infiltrator' | 'boss',
  phase: number,
  drillSpin: number
): Face3D[] {
  // For the primary miner feel, use our 3D Human Miner with role-tinted armor/drill!
  if (role === 'specialist' || role === 'rookie') {
    return buildHumanMinerDigging3D(phase * 0.5, drillSpin);
  }

  const faces: Face3D[] = [];
  const bob = Math.sin(phase * 3.2) * 1.8;
  const pal =
    role === 'infiltrator'
      ? {
          suit: [6, 78, 59] as [number, number, number],
          trim: [16, 185, 129] as [number, number, number],
          visor: [52, 211, 153] as [number, number, number],
          helmet: [2, 44, 34] as [number, number, number],
        }
      : {
          suit: [24, 24, 27] as [number, number, number],
          trim: [251, 191, 36] as [number, number, number],
          visor: [239, 68, 68] as [number, number, number],
          helmet: [9, 9, 11] as [number, number, number],
        };

  const torso = createBox3D(18, 18, 12, pal.suit, 0.88, 0.65);
  const head = createBox3D(15, 13, 14, pal.helmet, 0.86, 0.7);
  const visor = createBox3D(13, 4.5, 2.5, pal.visor, 0.95, 0.95, 0.92);
  const crown = createBox3D(11, 4, 10, pal.trim, 0.7, 0.95, 0.35);
  const drillCone = createCylinderZ3D(1.5, 6, 16, 8, pal.trim, [254, 240, 138], 0.9, 0.4);

  faces.push(...transformFaces(torso, 0, 0, 0, 0, 4 + bob, 0));
  faces.push(...transformFaces(head, 0, 0, 0, 0, -11 + bob, 0.5));
  faces.push(...transformFaces(visor, 0, 0, 0, 0, -11 + bob, 7.2));
  faces.push(...transformFaces(crown, 0, drillSpin * 0.3, 0, 0, -19 + bob, 0.5));
  faces.push(...transformFaces(drillCone, 0, 0, drillSpin * 2, 11, 4 + bob, 14));

  return faces;
}

export function renderScene3D(
  ctx: CanvasRenderingContext2D,
  worldFaces: Face3D[],
  camRx: number,
  camRy: number,
  centerX: number,
  centerY: number,
  scale = 1.0,
  fovDist = 540
) {
  const projected: ProjectedPoly[] = [];

  for (let i = 0; i < worldFaces.length; i++) {
    const f = worldFaces[i];
    const rotatedVerts: Vec3[] = new Array(f.verts.length);
    let sumZ = 0;

    for (let j = 0; j < f.verts.length; j++) {
      const rv = rotatePoint3D(f.verts[j], camRx, camRy, 0);
      rotatedVerts[j] = rv;
      sumZ += rv.z;
    }

    const normal = computeFaceNormal(rotatedVerts);
    if (normal.z < -0.2) continue;

    const avgZ = sumZ / f.verts.length;
    const fillStyle = shadeColor(
      f.baseColor,
      normal,
      f.metallic ?? 0.4,
      f.emissive ?? 0
    );

    const pts2D = rotatedVerts.map((v) => {
      const perspective = fovDist / Math.max(140, fovDist - v.z);
      return {
        x: centerX + v.x * scale * perspective,
        y: centerY + v.y * scale * perspective,
      };
    });

    projected.push({
      points: pts2D,
      depth: avgZ,
      fillStyle,
      strokeStyle: f.strokeColor || 'rgba(8, 12, 16, 0.72)',
      alpha: f.alpha ?? 1,
    });
  }

  projected.sort((a, b) => a.depth - b.depth);

  for (let i = 0; i < projected.length; i++) {
    const poly = projected[i];
    const pts = poly.points;
    if (pts.length < 3) continue;

    ctx.save();
    if (poly.alpha < 1) ctx.globalAlpha = poly.alpha;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) {
      ctx.lineTo(pts[j].x, pts[j].y);
    }
    ctx.closePath();

    ctx.fillStyle = poly.fillStyle;
    ctx.fill();

    if (poly.strokeStyle !== 'none') {
      ctx.lineWidth = 0.85;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = poly.strokeStyle;
      ctx.stroke();
    }
    ctx.restore();
  }
}
