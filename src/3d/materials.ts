import * as THREE from 'three';

/**
 * Procedural PBR Texture Library for Realistic Refinery & LNG Industrial Engineering
 * Zero external 404 dependencies — all normal, roughness, and albedo maps generated in-memory.
 */

function createIndustrialConcreteTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base weathered industrial concrete slab color
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate grain & asphalt wear noise
  for (let i = 0; i < 4200; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const tone = 185 + ((i * 29) % 35);
    ctx.fillStyle = `rgba(${tone}, ${tone + 3}, ${tone + 7}, 0.25)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Expansion joints & drainage channels
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Sub-grid slab seams
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 32; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createBrushedMetalTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);

  // Micro horizontal streaks + circumferential weld seams for pressure vessels
  for (let y = 0; y < 256; y++) {
    const isWeldSeam = y % 64 === 0 || y % 64 === 1;
    const val = isWeldSeam ? 75 : Math.floor(125 + ((y * 37) % 45));
    ctx.fillStyle = `rgb(${val},${val},${val})`;
    ctx.fillRect(0, y, 256, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createCorrugatedCladdingTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  for (let x = 0; x < 256; x += 8) {
    const shade = x % 16 === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, 4, 256);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 4, 0, 4, 256);
  }

  // Horizontal panel lap joints
  ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
  for (let y = 0; y < 256; y += 64) {
    ctx.fillRect(0, y, 256, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createHazardChevronTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0f172a';
  for (let i = -256; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i - 224, 256);
    ctx.lineTo(i - 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createSteelGratingTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export interface MaterialPalette {
  baseClay: THREE.MeshStandardMaterial;
  panelWhite: THREE.MeshStandardMaterial;
  concretePaving: THREE.MeshStandardMaterial;
  roadWay: THREE.MeshStandardMaterial;
  roadCrossWay: THREE.MeshStandardMaterial;
  roadMarking: THREE.MeshBasicMaterial;
  gpBlue: THREE.MeshStandardMaterial;
  gpCyan: THREE.MeshStandardMaterial;
  steelTruss: THREE.MeshStandardMaterial;
  darkAccent: THREE.MeshStandardMaterial;
  frostedGlass: THREE.MeshPhysicalMaterial;
  cryoGlass: THREE.MeshPhysicalMaterial;
  waterDeep: THREE.MeshStandardMaterial;
  waterShallow: THREE.MeshStandardMaterial;
  treeFoliage: THREE.MeshStandardMaterial;
  treeTrunk: THREE.MeshStandardMaterial;
  glowNightLight: THREE.MeshBasicMaterial;
  flareGlow: THREE.MeshBasicMaterial;
  shipDeck: THREE.MeshStandardMaterial;
  // Authentic CGTrader Industrial & Refinery Kit Materials
  safetyYellow: THREE.MeshStandardMaterial;
  valveRed: THREE.MeshStandardMaterial;
  weatheredRust: THREE.MeshStandardMaterial;
  corrugatedSteel: THREE.MeshStandardMaterial;
  copperBrass: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  steelGrating: THREE.MeshStandardMaterial;
  shipHullRed: THREE.MeshStandardMaterial;
}

export function createMaterialPalette(isSoftwareGl = false, maxAnisotropy = 4): MaterialPalette {
  const gridTex = createIndustrialConcreteTexture(maxAnisotropy);
  const metalTex = createBrushedMetalTexture(maxAnisotropy);
  const corrugatedTex = createCorrugatedCladdingTexture(maxAnisotropy);
  const hazardTex = createHazardChevronTexture(maxAnisotropy);
  const gratingTex = createSteelGratingTexture(maxAnisotropy);

  return {
    baseClay: new THREE.MeshStandardMaterial({
      color: 0xd8e0e9,
      roughness: 0.34,
      metalness: 0.48,
      roughnessMap: metalTex
    }),
    panelWhite: new THREE.MeshStandardMaterial({
      color: 0xeef2f6,
      roughness: 0.32,
      metalness: 0.22,
      roughnessMap: metalTex
    }),
    concretePaving: new THREE.MeshStandardMaterial({
      color: 0xd4dce6,
      map: gridTex,
      roughness: 0.82,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    }),
    roadWay: new THREE.MeshStandardMaterial({
      color: 0x273244,
      roughness: 0.72,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    }),
    roadCrossWay: new THREE.MeshStandardMaterial({
      color: 0x273244,
      roughness: 0.72,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    }),
    roadMarking: new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    }),
    gpBlue: new THREE.MeshStandardMaterial({
      color: 0x0058e6,
      roughness: 0.26,
      metalness: 0.52,
      roughnessMap: metalTex
    }),
    gpCyan: new THREE.MeshStandardMaterial({
      color: 0x00b8e6,
      roughness: 0.24,
      metalness: 0.58,
      roughnessMap: metalTex
    }),
    steelTruss: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.86,
      roughnessMap: metalTex
    }),
    darkAccent: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.78,
      roughnessMap: metalTex
    }),
    frostedGlass: new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: isSoftwareGl ? 0.38 : 0.48,
      roughness: 0.14,
      transmission: isSoftwareGl ? 0 : 0.76,
      thickness: 1.2,
      ior: 1.48,
      depthWrite: false
    }),
    cryoGlass: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 0.72,
      roughness: 0.12,
      transmission: isSoftwareGl ? 0 : 0.62,
      thickness: 1.0,
      ior: 1.5,
      depthWrite: false
    }),
    waterDeep: new THREE.MeshStandardMaterial({
      color: 0x03398c,
      roughness: 0.14,
      metalness: 0.68,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    }),
    waterShallow: new THREE.MeshStandardMaterial({
      color: 0x0262c4,
      roughness: 0.18,
      metalness: 0.55,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    }),
    treeFoliage: new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.65,
      metalness: 0.05
    }),
    treeTrunk: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.05
    }),
    glowNightLight: new THREE.MeshBasicMaterial({
      color: 0xffd166
    }),
    flareGlow: new THREE.MeshBasicMaterial({
      color: 0xff7b00
    }),
    shipDeck: new THREE.MeshStandardMaterial({
      color: 0x1e3a2f,
      roughness: 0.55,
      metalness: 0.35
    }),
    safetyYellow: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.34,
      metalness: 0.42
    }),
    valveRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.32,
      metalness: 0.5
    }),
    weatheredRust: new THREE.MeshStandardMaterial({
      color: 0x7c3f23,
      roughness: 0.78,
      metalness: 0.45,
      roughnessMap: metalTex
    }),
    corrugatedSteel: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      map: corrugatedTex,
      roughness: 0.42,
      metalness: 0.68
    }),
    copperBrass: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.88
    }),
    hazardStripe: new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.5,
      metalness: 0.2
    }),
    steelGrating: new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: gratingTex,
      roughness: 0.48,
      metalness: 0.75
    }),
    shipHullRed: new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.46,
      metalness: 0.45,
      roughnessMap: metalTex
    })
  };
}

export function updateMaterialsForTheme(palette: MaterialPalette, isNight: boolean): void {
  if (isNight) {
    palette.baseClay.color.setHex(0x334155);
    palette.panelWhite.color.setHex(0x475569);
    palette.concretePaving.color.setHex(0x1e293b);
    palette.roadWay.color.setHex(0x0b111e);
    palette.roadCrossWay.color.setHex(0x0b111e);
    palette.steelTruss.color.setHex(0x64748b);
    palette.corrugatedSteel.color.setHex(0x475569);
    palette.waterDeep.color.setHex(0x020d24);
    palette.waterShallow.color.setHex(0x041d42);
    palette.frostedGlass.color.setHex(0x38bdf8);
    palette.frostedGlass.opacity = 0.68;
  } else {
    palette.baseClay.color.setHex(0xd8e0e9);
    palette.panelWhite.color.setHex(0xeef2f6);
    palette.concretePaving.color.setHex(0xd4dce6);
    palette.roadWay.color.setHex(0x273244);
    palette.roadCrossWay.color.setHex(0x273244);
    palette.steelTruss.color.setHex(0x94a3b8);
    palette.corrugatedSteel.color.setHex(0xe2e8f0);
    palette.waterDeep.color.setHex(0x03398c);
    palette.waterShallow.color.setHex(0x0262c4);
    palette.frostedGlass.color.setHex(0xdbeafe);
    palette.frostedGlass.opacity = 0.48;
  }
}
