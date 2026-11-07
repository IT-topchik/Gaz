import React, { useState, useRef } from 'react';
import { CameraTelemetry } from '../3d/engine';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Maximize2 } from 'lucide-react';

interface MiniMapProps {
  telemetry: CameraTelemetry;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onTeleportToCoords: (worldX: number, worldZ: number) => void;
  isZenMode: boolean;
  isHeatmapEnabled?: boolean;
}

// World boundaries mapped onto the 240x140 SVG viewport
const WORLD_MIN_X = -105;
const WORLD_MAX_X = 115;
const WORLD_MIN_Z = -65;
const WORLD_MAX_Z = 65;

const SVG_WIDTH = 240;
const SVG_HEIGHT = 142;

function worldToSvgX(wx: number): number {
  const norm = (wx - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X);
  return Math.max(4, Math.min(SVG_WIDTH - 4, norm * SVG_WIDTH));
}

function worldToSvgY(wz: number): number {
  const norm = (wz - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z);
  return Math.max(4, Math.min(SVG_HEIGHT - 4, norm * SVG_HEIGHT));
}

function svgToWorld(svgX: number, svgY: number): { wx: number; wz: number } {
  const wx = WORLD_MIN_X + (svgX / SVG_WIDTH) * (WORLD_MAX_X - WORLD_MIN_X);
  const wz = WORLD_MIN_Z + (svgY / SVG_HEIGHT) * (WORLD_MAX_Z - WORLD_MIN_Z);
  return { wx, wz };
}

const PLANT_ZONES = [
  { id: 0, label: '1', name: 'Сепарация', wx: -38, wz: 0, w: 22, d: 24, heatColor: '#f59e0b' },
  { id: 1, label: '2', name: 'Фракционирование', wx: -12, wz: 0, w: 20, d: 26, heatColor: '#ef4444' },
  { id: 2, label: '3', name: 'Сжижение MCHE', wx: 12, wz: 0, w: 24, d: 26, heatColor: '#dc2626' },
  { id: 3, label: '4', name: 'Парк СПГ', wx: 38, wz: -2, w: 22, d: 42, heatColor: '#10b981' },
  { id: 4, label: '5', name: 'Терминал / Arc7', wx: 68, wz: 0, w: 24, d: 62, heatColor: '#f97316' }
];

export const MiniMap: React.FC<MiniMapProps> = ({
  telemetry,
  currentStepIndex,
  onSelectStep,
  onTeleportToCoords,
  isZenMode,
  isHeatmapEnabled = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    let wasMobile = window.innerWidth < 768;
    const onResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        setIsCollapsed(isMobile);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const camSvgX = worldToSvgX(telemetry.camX);
  const camSvgY = worldToSvgY(telemetry.camZ);
  const targetSvgX = worldToSvgX(telemetry.targetX);
  const targetSvgY = worldToSvgY(telemetry.targetZ);

  // Calculate FOV cone polygon points in SVG space
  const coneLength = 38;
  const halfAngleRad = ((telemetry.fovDeg || 38) * 0.65 * Math.PI) / 180;
  const dirRad = (telemetry.azimuthDeg * Math.PI) / 180;

  const leftX = camSvgX + Math.cos(dirRad - halfAngleRad) * coneLength;
  const leftY = camSvgY + Math.sin(dirRad - halfAngleRad) * coneLength;
  const rightX = camSvgX + Math.cos(dirRad + halfAngleRad) * coneLength;
  const rightY = camSvgY + Math.sin(dirRad + halfAngleRad) * coneLength;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;
    const { wx, wz } = svgToWorld(clickX, clickY);
    onTeleportToCoords(wx, wz);
  };

  const hoveredZone = PLANT_ZONES.find((z) => z.id === hoveredZoneId);

  return (
    <motion.div
      data-testid="minimap-widget"
      initial={false}
      animate={{
        y: isZenMode ? 120 : 0,
        opacity: isZenMode ? 0 : 1
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`fixed ${
        isHeatmapEnabled ? 'bottom-[198px]' : 'bottom-[138px]'
      } right-2.5 sm:bottom-5 sm:right-5 z-20 pointer-events-auto select-none transition-[bottom] duration-200 ${
        isZenMode ? 'pointer-events-none' : ''
      }`}
    >
      <div
        className={`relative bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl hover:shadow-blue-500/15 transition-all overflow-hidden ${
          isCollapsed ? 'p-1.5 w-auto' : 'p-1.5 w-[228px] sm:w-[252px]'
        }`}
      >
        {isCollapsed ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsCollapsed(false)}
            title="Развернуть мини-карту"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
            >
              {/* Overlaid Collapse Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                title="Свернуть мини-карту"
                className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-lg bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
              </motion.button>

              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                onClick={handleSvgClick}
                className="w-full h-[138px] block cursor-crosshair"
              >
                <defs>
                  <linearGradient id="fovConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0062ff" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#00d0f5" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Landmass & Marine Harbor Water */}
                <rect
                  x="0"
                  y="0"
                  width={worldToSvgX(46)}
                  height={SVG_HEIGHT}
                  className="fill-slate-200/70 dark:fill-slate-900"
                />
                <rect
                  x={worldToSvgX(46)}
                  y="0"
                  width={SVG_WIDTH - worldToSvgX(46)}
                  height={SVG_HEIGHT}
                  className="fill-sky-200/70 dark:fill-sky-950/70"
                />

                {/* Subtle Coordinate Grid Lines */}
                {[-75, -50, -25, 0, 25, 50, 75].map((gx) => {
                  const sx = worldToSvgX(gx);
                  return (
                    <line
                      key={`gx-${gx}`}
                      x1={sx}
                      y1={0}
                      x2={sx}
                      y2={SVG_HEIGHT}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-slate-300/70 dark:text-slate-800/80"
                    />
                  );
                })}
                {[-40, -20, 0, 20, 40].map((gz) => {
                  const sy = worldToSvgY(gz);
                  return (
                    <line
                      key={`gz-${gz}`}
                      x1={0}
                      y1={sy}
                      x2={SVG_WIDTH}
                      y2={sy}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-slate-300/70 dark:text-slate-800/80"
                    />
                  );
                })}

                {/* Main Cryogenic Pipeline Line */}
                <line
                  x1={worldToSvgX(-38)}
                  y1={worldToSvgY(0)}
                  x2={worldToSvgX(54)}
                  y2={worldToSvgY(0)}
                  stroke="#0062ff"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />

                {/* Flare Stack Icon (-78, -32) */}
                <g transform={`translate(${worldToSvgX(-78)}, ${worldToSvgY(-32)})`}>
                  <circle r="3.5" fill="#f97316" opacity="0.25" />
                  <circle r="2" fill="#f97316" />
                </g>

                {/* Technological Process Units 1..5 */}
                {PLANT_ZONES.map((zone) => {
                  const zx = worldToSvgX(zone.wx - zone.w / 2);
                  const zy = worldToSvgY(zone.wz - zone.d / 2);
                  const zw = (zone.w / (WORLD_MAX_X - WORLD_MIN_X)) * SVG_WIDTH;
                  const zd = (zone.d / (WORLD_MAX_Z - WORLD_MIN_Z)) * SVG_HEIGHT;
                  const cx = worldToSvgX(zone.wx);
                  const cy = worldToSvgY(zone.wz);
                  const isActive = currentStepIndex === zone.id;
                  const isHovered = hoveredZoneId === zone.id;

                  return (
                    <g
                      key={zone.id}
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStep(zone.id);
                      }}
                      className="cursor-pointer group"
                    >
                      {isHeatmapEnabled && (
                        <>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={Math.max(zw, zd) * 0.65}
                            fill={zone.heatColor}
                            opacity={isActive ? 0.35 : 0.22}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={Math.max(zw, zd) * 0.4}
                            fill={zone.heatColor}
                            opacity={isActive ? 0.5 : 0.32}
                          />
                        </>
                      )}
                      <rect
                        x={zx}
                        y={zy}
                        width={zw}
                        height={zd}
                        rx="3"
                        className={`transition-all ${
                          isActive
                            ? 'fill-blue-600/25 stroke-blue-600 dark:fill-cyan-500/25 dark:stroke-cyan-400'
                            : isHovered
                            ? 'fill-blue-500/15 stroke-blue-500'
                            : 'fill-white/80 dark:fill-slate-800/80 stroke-slate-400/70 dark:stroke-slate-700'
                        }`}
                        strokeWidth={isActive || isHovered ? '1.5' : '1'}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isActive || isHovered ? '6.8' : '5.5'}
                        className={
                          isActive
                            ? 'fill-blue-600 dark:fill-cyan-500'
                            : isHovered
                            ? 'fill-blue-500'
                            : 'fill-slate-700 dark:fill-slate-600'
                        }
                      />
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        className="fill-white text-[8px] font-extrabold font-mono pointer-events-none"
                      >
                        {zone.label}
                      </text>
                    </g>
                  );
                })}

                {/* Camera Field-of-View Sector Cone */}
                <polygon
                  points={`${camSvgX},${camSvgY} ${leftX},${leftY} ${rightX},${rightY}`}
                  fill="url(#fovConeGrad)"
                  stroke="#0062ff"
                  strokeWidth="0.75"
                  strokeOpacity="0.5"
                />

                {/* Line connecting Camera to Orbit LookAt Target */}
                <line
                  x1={camSvgX}
                  y1={camSvgY}
                  x2={targetSvgX}
                  y2={targetSvgY}
                  stroke="#00d0f5"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />

                {/* Orbit LookAt Target Reticle */}
                <circle
                  cx={targetSvgX}
                  cy={targetSvgY}
                  r="3"
                  fill="none"
                  stroke="#00d0f5"
                  strokeWidth="1.2"
                />

                {/* User Camera Position Marker */}
                <g transform={`translate(${camSvgX}, ${camSvgY}) rotate(${telemetry.azimuthDeg})`}>
                  <circle r="5" fill="#0062ff" stroke="#ffffff" strokeWidth="1.5" />
                  <polygon points="6,0 1.5,-2.5 1.5,2.5" fill="#ffffff" />
                </g>
              </svg>

              {/* Hover Zone Badge */}
              {hoveredZone && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold pointer-events-none shadow-sm">
                  Узел {hoveredZone.label}: {hoveredZone.name}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
