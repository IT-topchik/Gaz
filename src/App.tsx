import React, { useEffect, useRef, useState } from 'react';
import { Plant3DEngine, CameraTelemetry } from './3d/engine';
import { Header } from './components/Header';
import { TourHUD } from './components/TourHUD';
import { MiniMap } from './components/MiniMap';
import { AuthModal } from './components/AuthModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TOUR_STEPS } from './data/tourData';
import { authService } from './services/auth';
import { appCache } from './services/cache';
import { UserAccount } from './types/tour';
import { Compass, ShieldCheck } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'gp_152fz_cookie_consent_v1';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Plant3DEngine | null>(null);
  const lastTelemetryEmitRef = useRef<number>(0);

  // Application States
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoTour, setIsAutoTour] = useState(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    const cachedTheme = appCache.get<'day' | 'night'>('user_preferred_theme');
    return cachedTheme === 'night';
  });
  const [isHeatmapEnabled, setIsHeatmapEnabled] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [privacyModalState, setPrivacyModalState] = useState<{
    isOpen: boolean;
    tab: 'policy' | 'consent' | 'rights';
  }>({ isOpen: false, tab: 'policy' });
  const [cookieConsentAccepted, setCookieConsentAccepted] = useState<boolean>(() => {
    return appCache.get<boolean>(COOKIE_CONSENT_KEY) === true;
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [cacheStats, setCacheStats] = useState(appCache.getStats());

  // Real-time Camera Telemetry for MiniMap
  const [cameraTelemetry, setCameraTelemetry] = useState<CameraTelemetry>(() => {
    const s0 = TOUR_STEPS[0];
    const dx = s0.lookAt.x - s0.camera.x;
    const dz = s0.lookAt.z - s0.camera.z;
    return {
      camX: s0.camera.x,
      camY: s0.camera.y,
      camZ: s0.camera.z,
      targetX: s0.lookAt.x,
      targetZ: s0.lookAt.z,
      azimuthDeg: (Math.atan2(dz, dx) * 180) / Math.PI,
      fovDeg: 38
    };
  });

  // Initialize Auth state
  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  // Sync dark class on html root for Tailwind dark mode
  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    appCache.set('user_preferred_theme', isNightMode ? 'night' : 'day', undefined, true);
    setCacheStats(appCache.getStats());
  }, [isNightMode]);

  // Mount Three.js Engine once in stable ref container
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new Plant3DEngine(
      canvasMountRef.current,
      {
        onStepSelect: (stepIndex) => {
          setCurrentStepIndex(stepIndex);
          engine.setActiveStep(stepIndex);
        },
        onCameraMoveStart: () => {
          // If user manually rotates or pans, pause auto tour so camera doesn't jerk
          setIsAutoTour(false);
        },
        onCameraUpdate: (telemetry) => {
          const now = performance.now();
          if (now - lastTelemetryEmitRef.current < 32) return;
          lastTelemetryEmitRef.current = now;

          setCameraTelemetry((prev) => {
            const moved =
              Math.abs(prev.camX - telemetry.camX) > 0.08 ||
              Math.abs(prev.camZ - telemetry.camZ) > 0.08 ||
              Math.abs(prev.targetX - telemetry.targetX) > 0.08 ||
              Math.abs(prev.targetZ - telemetry.targetZ) > 0.08 ||
              Math.abs(prev.azimuthDeg - telemetry.azimuthDeg) > 0.4;
            return moved ? telemetry : prev;
          });
        }
      },
      isNightMode
    );

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update 3D engine on night mode toggle
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setNightMode(isNightMode);
    }
  }, [isNightMode]);

  // Update 3D engine on heatmap overlay toggle
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setHeatmapEnabled(isHeatmapEnabled);
    }
  }, [isHeatmapEnabled]);

  // Handle Step change
  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    if (engineRef.current) {
      engineRef.current.flyToStep(index);
    }
  };

  // Handle free-click teleportation from MiniMap
  const handleTeleportToCoords = (worldX: number, worldZ: number) => {
    setIsAutoTour(false);
    if (engineRef.current) {
      engineRef.current.flyToWorldCoords(worldX, worldZ);
    }
  };

  // Auto-tour loop
  useEffect(() => {
    if (!isAutoTour) return;

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = (prev + 1) % TOUR_STEPS.length;
        if (engineRef.current) {
          engineRef.current.flyToStep(next);
        }
        return next;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [isAutoTour]);

  // Auth Handlers
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCacheStats(appCache.getStats());
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCacheStats(appCache.getStats());
  };

  const handleOpenPrivacyPolicy = (tab: 'policy' | 'consent' | 'rights' = 'policy') => {
    setPrivacyModalState({ isOpen: true, tab });
  };

  const handleAcceptCookies = () => {
    appCache.set(COOKIE_CONSENT_KEY, true, 365 * 24 * 60 * 60 * 1000, true);
    setCookieConsentAccepted(true);
    setCacheStats(appCache.getStats());
  };

  return (
    <div
      data-heatmap={isHeatmapEnabled ? 'active' : 'inactive'}
      className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans"
    >
      {/* 3D WebGL Canvas Container (Isolated from React DOM reconciler) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0" />

      {/* Top Header UI */}
      <div className="absolute top-0 left-0 right-0 p-2.5 sm:p-6 z-20 pointer-events-none">
        <Header
          currentUser={currentUser}
          isNightMode={isNightMode}
          onToggleNightMode={() => setIsNightMode((prev) => !prev)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
          onLogout={handleLogout}
          cacheHitRate={cacheStats.hitRate}
        />
      </div>

      {/* Main Tour HUD & Ergonomic Bottom Dock */}
      <TourHUD
        steps={TOUR_STEPS}
        currentStepIndex={currentStepIndex}
        onSelectStep={handleSelectStep}
        isAutoTour={isAutoTour}
        onToggleAutoTour={() => setIsAutoTour((prev) => !prev)}
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        isHeatmapEnabled={isHeatmapEnabled}
        onToggleHeatmap={() => setIsHeatmapEnabled((prev) => !prev)}
      />

      {/* Real-time Interactive MiniMap in Bottom-Right Corner */}
      <MiniMap
        telemetry={cameraTelemetry}
        currentStepIndex={currentStepIndex}
        onSelectStep={handleSelectStep}
        onTeleportToCoords={handleTeleportToCoords}
        isZenMode={isZenMode}
        isHeatmapEnabled={isHeatmapEnabled}
      />

      {/* 152-FZ Technical Cookie / Local Storage Consent Banner */}
      {!cookieConsentAccepted && !isZenMode && (
        <div
          className={`absolute ${
            isHeatmapEnabled ? 'bottom-[242px] sm:bottom-28' : 'bottom-[184px] sm:bottom-16'
          } left-2.5 right-2.5 sm:right-auto sm:left-5 z-30 sm:max-w-xs p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl text-xs text-slate-600 dark:text-slate-300 space-y-2 transition-[bottom] duration-200`}
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11px]">
              Мы используем локальное кеширование и технические файлы cookie в соответствии с{' '}
              <button
                type="button"
                onClick={() => handleOpenPrivacyPolicy('policy')}
                className="font-bold text-blue-600 dark:text-cyan-400 underline cursor-pointer"
              >
                ФЗ № 152-ФЗ «О персональных данных»
              </button>
              .
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenPrivacyPolicy('policy')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Политика 152-ФЗ
            </button>
            <button
              type="button"
              onClick={handleAcceptCookies}
              className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
            >
              Согласен
            </button>
          </div>
        </div>
      )}

      {/* Bottom-left Viewport Controls Hint */}
      <div
        className={`absolute bottom-5 left-5 z-10 pointer-events-none transition-all duration-300 hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shadow-md ${
          isZenMode ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <Compass className="w-3.5 h-3.5 text-blue-500" />
        <span>ЛКМ: Вращение | ПКМ: Панорама | Колесо: Зум</span>
      </div>

      {/* Auth Modal Dialog */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
      />

      {/* 152-FZ Personal Data Policy & Subject Rights Modal */}
      <PrivacyPolicyModal
        isOpen={privacyModalState.isOpen}
        initialTab={privacyModalState.tab}
        onClose={() => setPrivacyModalState((prev) => ({ ...prev, isOpen: false }))}
        currentUser={currentUser}
        onUserDeleted={() => {
          setCurrentUser(null);
          setCacheStats(appCache.getStats());
        }}
      />
    </div>
  );
}
