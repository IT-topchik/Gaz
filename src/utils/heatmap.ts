export interface HeatmapZone {
  id: string;
  stepIndex: number | null;
  name: string;
  shortName: string;
  wx: number;
  wz: number;
  radiusX: number;
  radiusZ: number;
  height: number;
  baseY: number;
  loadPct: number;
  tempLabel: string;
  intensityLevel: 'nominal' | 'elevated' | 'peak';
  coreColor: string;
  midColor: string;
  outerColor: string;
  threeColorHex: number;
}

export const PRODUCTION_HEATMAP_ZONES: HeatmapZone[] = [
  {
    id: 'zone-sep',
    stepIndex: 0,
    name: 'Входная сепарация и осушка',
    shortName: 'Сепарация',
    wx: -38,
    wz: 0,
    radiusX: 15.5,
    radiusZ: 16.5,
    height: 19,
    baseY: 1.95,
    loadPct: 88,
    tempLabel: '+18°C / 7.8 МПа',
    intensityLevel: 'elevated',
    coreColor: 'rgba(249, 115, 22, 0.88)',
    midColor: 'rgba(234, 179, 8, 0.55)',
    outerColor: 'rgba(16, 185, 129, 0.0)',
    threeColorHex: 0xf59e0b
  },
  {
    id: 'zone-frac',
    stepIndex: 1,
    name: 'Ректификация и фракционирование',
    shortName: 'Ректификация',
    wx: -12,
    wz: 0,
    radiusX: 14.5,
    radiusZ: 17.5,
    height: 31,
    baseY: 1.95,
    loadPct: 96,
    tempLabel: '+118°C / 3.4 МПа',
    intensityLevel: 'peak',
    coreColor: 'rgba(239, 68, 68, 0.92)',
    midColor: 'rgba(249, 115, 22, 0.62)',
    outerColor: 'rgba(234, 179, 8, 0.0)',
    threeColorHex: 0xef4444
  },
  {
    id: 'zone-mche',
    stepIndex: 2,
    name: 'Криогенное сжижение (MCHE)',
    shortName: 'Сжижение',
    wx: 12,
    wz: 0,
    radiusX: 16.5,
    radiusZ: 17.5,
    height: 27,
    baseY: 1.95,
    loadPct: 99,
    tempLabel: '-161.8°C / Пик КПД',
    intensityLevel: 'peak',
    coreColor: 'rgba(220, 38, 38, 0.95)',
    midColor: 'rgba(249, 115, 22, 0.68)',
    outerColor: 'rgba(6, 182, 212, 0.0)',
    threeColorHex: 0xff2a1a
  },
  {
    id: 'zone-tanks',
    stepIndex: 3,
    name: 'Изотермический парк резервуаров СПГ',
    shortName: 'Парк СПГ',
    wx: 38,
    wz: -2,
    radiusX: 16.5,
    radiusZ: 24.5,
    height: 24,
    baseY: 1.95,
    loadPct: 87,
    tempLabel: '-162.0°C / 87.4%',
    intensityLevel: 'nominal',
    coreColor: 'rgba(16, 185, 129, 0.88)',
    midColor: 'rgba(6, 182, 212, 0.55)',
    outerColor: 'rgba(59, 130, 246, 0.0)',
    threeColorHex: 0x10b981
  },
  {
    id: 'zone-term',
    stepIndex: 4,
    name: 'Морской терминал и Танкер Arc7',
    shortName: 'Терминал',
    wx: 65,
    wz: 0,
    radiusX: 19.5,
    radiusZ: 34.0,
    height: 20,
    baseY: 3.55,
    loadPct: 97,
    tempLabel: '12 800 м³/ч (Налив)',
    intensityLevel: 'peak',
    coreColor: 'rgba(239, 68, 68, 0.90)',
    midColor: 'rgba(249, 115, 22, 0.58)',
    outerColor: 'rgba(234, 179, 8, 0.0)',
    threeColorHex: 0xf97316
  },
  {
    id: 'zone-flare',
    stepIndex: null,
    name: 'Факельная установка утилизации',
    shortName: 'Факел',
    wx: -78,
    wz: -32,
    radiusX: 9.5,
    radiusZ: 9.5,
    height: 38,
    baseY: 1.95,
    loadPct: 92,
    tempLabel: '+850°C / Дежурный',
    intensityLevel: 'peak',
    coreColor: 'rgba(239, 68, 68, 0.90)',
    midColor: 'rgba(249, 115, 22, 0.52)',
    outerColor: 'rgba(234, 179, 8, 0.0)',
    threeColorHex: 0xef4444
  }
];

export function getHeatmapZoneForStep(stepIndex: number): HeatmapZone {
  const found = PRODUCTION_HEATMAP_ZONES.find((z) => z.stepIndex === stepIndex);
  return found || PRODUCTION_HEATMAP_ZONES[0];
}

export function computeAveragePlantLoad(zones: HeatmapZone[] = PRODUCTION_HEATMAP_ZONES): number {
  const stepZones = zones.filter((z) => z.stepIndex !== null);
  if (stepZones.length === 0) return 0;
  const total = stepZones.reduce((acc, z) => acc + z.loadPct, 0);
  return Math.round((total / stepZones.length) * 10) / 10;
}

export function classifyLoadSeverity(loadPct: number): {
  label: string;
  badgeColor: string;
} {
  if (loadPct >= 95) {
    return {
      label: 'Пиковая активность',
      badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    };
  }
  if (loadPct >= 88) {
    return {
      label: 'Высокая нагрузка',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    };
  }
  return {
    label: 'Оптимальный режим',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  };
}
