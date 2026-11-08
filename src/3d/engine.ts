import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterialPalette, updateMaterialsForTheme, MaterialPalette } from './materials';
import { buildCompleteLngPlant, PlantBuildResult } from './plantModels';
import { TOUR_STEPS } from '../data/tourData';
import { PRODUCTION_HEATMAP_ZONES } from '../utils/heatmap';

export interface CameraTelemetry {
  camX: number;
  camY: number;
  camZ: number;
  targetX: number;
  targetZ: number;
  azimuthDeg: number;
  fovDeg: number;
}

export interface EngineCallbacks {
  onStepSelect: (stepIndex: number) => void;
  onCameraMoveStart?: () => void;
  onCameraUpdate?: (telemetry: CameraTelemetry) => void;
}

interface HeatmapZoneVisual {
  stepIndex: number | null;
  group: THREE.Group;
  padMat: THREE.MeshBasicMaterial;
  auraMat: THREE.MeshBasicMaterial;
  ringLower: THREE.Mesh;
  ringUpper: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  baseHeight: number;
}

export class Plant3DEngine {
  private container: HTMLDivElement;
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;

  private materials!: MaterialPalette;
  private plant!: PlantBuildResult;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private moonLight!: THREE.DirectionalLight;

  private hotspots: THREE.Group[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredHotspot: THREE.Group | null = null;

  // Pipeline flow particles
  private particleCount = 280;
  private particleGeo!: THREE.BufferGeometry;
  private particleMat!: THREE.PointsMaterial;
  private flowParticles!: THREE.Points;
  private progressArray!: Float32Array;
  private mainPipeCurve!: THREE.CatmullRomCurve3;

  // 3D Production Heatmap Overlay
  private heatmapGroup!: THREE.Group;
  private heatmapZoneVisuals: HeatmapZoneVisual[] = [];
  private heatmapPipeMat!: THREE.MeshBasicMaterial;
  private heatmapTextures: THREE.Texture[] = [];
  private isHeatmapEnabled = false;
  private heatmapAlpha = 0;
  private activeStepIndex = 0;

  // Animation & Camera Transition state
  private isNightMode = false;
  private isSoftwareGl = false;
  private lastTime = performance.now();
  private startTime = performance.now();
  private animFrameId = 0;

  private isTransitioning = false;
  private targetCamPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private transitionAlpha = 1.0;

  // Drag-vs-click detection to prevent camera drag misfires
  private pointerDownPos = { x: 0, y: 0 };
  private callbacks: EngineCallbacks;

  constructor(container: HTMLDivElement, callbacks: EngineCallbacks, initialNightMode = false) {
    this.container = container;
    this.callbacks = callbacks;
    this.isNightMode = initialNightMode;

    this.checkSoftwareGl();
    this.initCanvasAndRenderer();
    this.initSceneAndCamera();
    this.initLightingAndEnvironment();
    this.initPlantObjects();
    this.initFlowParticles();
    this.initHeatmapOverlay();
    this.initHotspots();
    this.initEvents();

    this.setNightMode(this.isNightMode, true);
    this.animate();
  }

  private checkSoftwareGl(): void {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
        this.isSoftwareGl = true;
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = false;
    }
  }

  private initCanvasAndRenderer(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.touchAction = 'none';
    this.container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initSceneAndCamera(): void {
    this.scene = new THREE.Scene();
    const bgDay = new THREE.Color(0xdbe6f2);
    this.scene.background = bgDay;
    this.scene.fog = new THREE.FogExp2(0xdbe6f2, 0.002);

    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    const initialFov = aspect < 0.85 ? 52 : 38;

    this.camera = new THREE.PerspectiveCamera(
      initialFov,
      aspect,
      0.5,
      2500
    );
    const startStep = TOUR_STEPS[0];
    this.camera.position.set(startStep.camera.x, startStep.camera.y, startStep.camera.z);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 0.85;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 420;
    this.controls.target.set(startStep.lookAt.x, startStep.lookAt.y, startStep.lookAt.z);

    this.controls.addEventListener('start', () => {
      // Cancel scripted camera animation if user grabs controls
      this.isTransitioning = false;
      this.callbacks.onCameraMoveStart?.();
    });
  }

  private initLightingAndEnvironment(): void {
    // Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.4);
    this.hemiLight.position.set(0, 80, 0);
    this.scene.add(this.hemiLight);

    // Warm Directional Sun Key Light
    this.sunLight = new THREE.DirectionalLight(0xfffbf2, 1.0);
    this.sunLight.position.set(85, 135, 95);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.sunLight.shadow.mapSize.width = 4096;
      this.sunLight.shadow.mapSize.height = 4096;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 480;
      const shadowDist = 155;
      this.sunLight.shadow.camera.left = -shadowDist;
      this.sunLight.shadow.camera.right = shadowDist;
      this.sunLight.shadow.camera.top = shadowDist;
      this.sunLight.shadow.camera.bottom = -shadowDist;
      this.sunLight.shadow.bias = -0.00015;
    }
    this.scene.add(this.sunLight);

    // Night Moon Light (initially off)
    this.moonLight = new THREE.DirectionalLight(0x7dd3fc, 0);
    this.moonLight.position.set(-80, 110, -70);
    this.scene.add(this.moonLight);
  }

  private initPlantObjects(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy() || 4;
    this.materials = createMaterialPalette(this.isSoftwareGl, maxAniso);
    this.plant = buildCompleteLngPlant(this.materials);
    this.scene.add(this.plant.root);
  }

  private initFlowParticles(): void {
    const pipePoints = [
      new THREE.Vector3(-38, 3.8, 0),
      new THREE.Vector3(-12, 3.8, 0),
      new THREE.Vector3(12, 3.8, 0),
      new THREE.Vector3(38, 3.8, 0),
      new THREE.Vector3(54, 3.8, 0)
    ];

    this.mainPipeCurve = new THREE.CatmullRomCurve3(pipePoints);
    this.particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.progressArray = new Float32Array(this.particleCount);

    for (let p = 0; p < this.particleCount; p++) {
      this.progressArray[p] = p / this.particleCount;
      const pt = this.mainPipeCurve.getPointAt(this.progressArray[p]);
      positions[p * 3] = pt.x;
      positions[p * 3 + 1] = pt.y + 0.05;
      positions[p * 3 + 2] = pt.z;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMat = new THREE.PointsMaterial({
      color: 0x00d0f5,
      size: 1.1,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    this.flowParticles = new THREE.Points(this.particleGeo, this.particleMat);
    this.flowParticles.renderOrder = 3;
    this.scene.add(this.flowParticles);
  }

  private createRadialHeatmapTexture(
    coreColor: string,
    midColor: string,
    outerColor: string,
    maxAniso: number
  ): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
    grad.addColorStop(0.0, coreColor);
    grad.addColorStop(0.38, coreColor);
    grad.addColorStop(0.72, midColor);
    grad.addColorStop(1.0, outerColor);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle concentric thermal isoline rings for industrial SCADA read
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    [0.32, 0.56, 0.78].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * ratio, 0, Math.PI * 2);
      ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    this.heatmapTextures.push(tex);
    return tex;
  }

  private createVerticalAuraTexture(coreColor: string, midColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Bottom of cylinder (v=0 -> y=256) is brightest, fading smoothly toward top (y=0)
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0.0, coreColor);
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.heatmapTextures.push(tex);
    return tex;
  }

  private initHeatmapOverlay(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy() || 4;
    this.heatmapGroup = new THREE.Group();
    this.heatmapGroup.visible = false;

    PRODUCTION_HEATMAP_ZONES.forEach((zone) => {
      const zoneGroup = new THREE.Group();
      zoneGroup.position.set(zone.wx, zone.baseY, zone.wz);

      // 1. Ground / Plinth Thermal Radial Pad
      const padTex = this.createRadialHeatmapTexture(
        zone.coreColor,
        zone.midColor,
        zone.outerColor,
        maxAniso
      );
      const padMat = new THREE.MeshBasicMaterial({
        map: padTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      });
      const padGeo = new THREE.PlaneGeometry(zone.radiusX * 2.25, zone.radiusZ * 2.25);
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.renderOrder = 4;
      zoneGroup.add(padMesh);

      // 2. 3D Volumetric Thermal Shell around active production equipment
      const auraTex = this.createVerticalAuraTexture(zone.coreColor, zone.midColor);
      const auraMat = new THREE.MeshBasicMaterial({
        map: auraTex,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const avgRadius = (zone.radiusX + zone.radiusZ) * 0.48;
      const auraGeo = new THREE.CylinderGeometry(avgRadius * 0.9, avgRadius * 1.05, zone.height, 36, 1, true);
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      auraMesh.position.y = zone.height * 0.5;
      auraMesh.scale.set(
        zone.radiusX / Math.max(1, avgRadius),
        1,
        zone.radiusZ / Math.max(1, avgRadius)
      );
      auraMesh.renderOrder = 4;
      zoneGroup.add(auraMesh);

      // 3. Elevated Iso-Thermal Contour Rings (animated scan rings)
      const ringMat = new THREE.MeshBasicMaterial({
        color: zone.threeColorHex,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const ringGeo = new THREE.RingGeometry(avgRadius * 0.92, avgRadius * 1.02, 44);
      const ringLower = new THREE.Mesh(ringGeo, ringMat);
      ringLower.rotation.x = -Math.PI / 2;
      ringLower.position.y = 0.25;
      ringLower.scale.set(
        zone.radiusX / Math.max(1, avgRadius),
        zone.radiusZ / Math.max(1, avgRadius),
        1
      );
      ringLower.renderOrder = 5;

      const ringUpper = new THREE.Mesh(ringGeo.clone(), ringMat);
      ringUpper.rotation.x = -Math.PI / 2;
      ringUpper.position.y = zone.height * 0.45;
      ringUpper.scale.set(
        (zone.radiusX / Math.max(1, avgRadius)) * 0.85,
        (zone.radiusZ / Math.max(1, avgRadius)) * 0.85,
        1
      );
      ringUpper.renderOrder = 5;

      zoneGroup.add(ringLower, ringUpper);
      this.heatmapGroup.add(zoneGroup);

      this.heatmapZoneVisuals.push({
        stepIndex: zone.stepIndex,
        group: zoneGroup,
        padMat,
        auraMat,
        ringLower,
        ringUpper,
        ringMat,
        baseHeight: zone.height
      });
    });

    // 4. Thermal Pipeline Transfer Corridor Overlay
    const pipeOverlayGeo = new THREE.TubeGeometry(this.mainPipeCurve, 80, 0.92, 14, false);
    this.heatmapPipeMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const pipeOverlayMesh = new THREE.Mesh(pipeOverlayGeo, this.heatmapPipeMat);
    pipeOverlayMesh.renderOrder = 4;
    this.heatmapGroup.add(pipeOverlayMesh);

    this.scene.add(this.heatmapGroup);
  }

  public setHeatmapEnabled(enabled: boolean): void {
    this.isHeatmapEnabled = enabled;
    if (enabled) {
      this.heatmapGroup.visible = true;
    }
  }

  public setActiveStep(stepIndex: number): void {
    this.activeStepIndex = stepIndex;
  }

  private initHotspots(): void {
    const hotspotCoords = [
      { step: 0, x: -38, y: 18.0, z: 0 },
      { step: 1, x: -12, y: 27.5, z: 0 },
      { step: 2, x: 12, y: 26.5, z: -2 },
      { step: 3, x: 38, y: 23.8, z: 0 },
      { step: 4, x: 64, y: 19.5, z: 0 }
    ];

    hotspotCoords.forEach((h, idx) => {
      const pinGroup = new THREE.Group();
      pinGroup.position.set(h.x, h.y, h.z);

      // Compact high-contrast industrial beacon core
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x0058e6 });
      const pinSphere = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), coreMat);

      // Crisp dual technical reticle rings
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00d0f5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const pinHalo = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.08, 24), haloMat);

      const outerHaloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const outerHalo = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.34, 24), outerHaloMat);

      pinGroup.add(pinSphere, pinHalo, outerHalo);
      pinGroup.userData = { stepIndex: idx, baseHeight: h.y };
      this.scene.add(pinGroup);
      this.hotspots.push(pinGroup);
    });
  }

  private initEvents(): void {
    window.addEventListener('resize', this.onResize);

    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointermove', this.onPointerMove);

    this.canvas.addEventListener('pointerup', (e) => {
      // Guard: only treat as click if movement is within 6px threshold
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist < 6) {
        this.handleCanvasClick(e);
      }
    });
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspots, true);

    if (intersects.length > 0) {
      this.canvas.style.cursor = 'pointer';
      const rootHit = intersects[0].object.parent as THREE.Group;
      if (this.hoveredHotspot !== rootHit) {
        if (this.hoveredHotspot) {
          this.hoveredHotspot.scale.set(1, 1, 1);
        }
        this.hoveredHotspot = rootHit;
        if (this.hoveredHotspot) {
          this.hoveredHotspot.scale.set(1.3, 1.3, 1.3);
        }
      }
    } else {
      this.canvas.style.cursor = 'default';
      if (this.hoveredHotspot) {
        this.hoveredHotspot.scale.set(1, 1, 1);
        this.hoveredHotspot = null;
      }
    }
  };

  private handleCanvasClick = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspots, true);

    if (intersects.length > 0) {
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && target.userData.stepIndex === undefined) {
        target = target.parent;
      }
      if (target && target.userData.stepIndex !== undefined) {
        this.callbacks.onStepSelect(target.userData.stepIndex);
      }
    }
  };

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 52 : 38;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setNightMode(isNight: boolean, immediate = false): void {
    this.isNightMode = isNight;
    updateMaterialsForTheme(this.materials, isNight);

    const targetBg = isNight ? new THREE.Color(0x060c18) : new THREE.Color(0xdbe6f2);

    this.scene.background = targetBg;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(targetBg);
    }
    this.sunLight.intensity = isNight ? 0.08 : 1.0;
    this.hemiLight.intensity = isNight ? 0.25 : 0.4;
    this.ambientLight.intensity = isNight ? 0.35 : 0.4;
    this.moonLight.intensity = isNight ? 0.85 : 0;
    this.plant.nightLights.forEach(l => (l.intensity = isNight ? 2.5 : 0));
  }

  public flyToStep(stepIndex: number): void {
    const data = TOUR_STEPS[stepIndex];
    if (!data) return;

    this.activeStepIndex = stepIndex;
    this.targetCamPos.set(data.camera.x, data.camera.y, data.camera.z);
    this.targetLookAt.set(data.lookAt.x, data.lookAt.y, data.lookAt.z);

    this.isTransitioning = true;
    this.transitionAlpha = 0;
  }

  public flyToWorldCoords(worldX: number, worldZ: number): void {
    const offsetX = this.camera.position.x - this.controls.target.x;
    const offsetZ = this.camera.position.z - this.controls.target.z;
    const clampedX = THREE.MathUtils.clamp(worldX, -95, 95);
    const clampedZ = THREE.MathUtils.clamp(worldZ, -55, 55);

    this.targetLookAt.set(clampedX, 10, clampedZ);
    this.targetCamPos.set(
      clampedX + THREE.MathUtils.clamp(offsetX, -45, 45),
      Math.max(this.camera.position.y, 34),
      clampedZ + THREE.MathUtils.clamp(offsetZ, 30, 60)
    );
    this.isTransitioning = true;
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.animFrameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private animate = (): void => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1);
    const camDt = Math.min(rawDt, 0.4);
    this.lastTime = now;
    const time = (now - this.startTime) / 1000;

    // Smooth camera interpolation if transitioning
    if (this.isTransitioning) {
      // Exponential smoothing towards target
      const k = this.isSoftwareGl ? 8.5 : 4.8;
      const factor = Math.min(1, 1 - Math.exp(-k * camDt));

      this.camera.position.lerp(this.targetCamPos, factor);
      this.controls.target.lerp(this.targetLookAt, factor);

      if (
        this.camera.position.distanceTo(this.targetCamPos) < 0.35 &&
        this.controls.target.distanceTo(this.targetLookAt) < 0.35
      ) {
        this.camera.position.copy(this.targetCamPos);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
      }
    }

    this.controls.update();

    // Emit real-time camera position and azimuth for MiniMap
    if (this.callbacks.onCameraUpdate) {
      const dx = this.controls.target.x - this.camera.position.x;
      const dz = this.controls.target.z - this.camera.position.z;
      const azimuthRad = Math.atan2(dz, dx);
      const azimuthDeg = (azimuthRad * 180) / Math.PI;
      this.callbacks.onCameraUpdate({
        camX: this.camera.position.x,
        camY: this.camera.position.y,
        camZ: this.camera.position.z,
        targetX: this.controls.target.x,
        targetZ: this.controls.target.z,
        azimuthDeg,
        fovDeg: this.camera.fov
      });
    }

    // Animate 3D Heatmap Overlay with smooth exponential damping
    const targetHeat = this.isHeatmapEnabled ? 1.0 : 0.0;
    this.heatmapAlpha = THREE.MathUtils.damp(
      this.heatmapAlpha,
      targetHeat,
      this.isSoftwareGl ? 12.0 : 6.5,
      camDt
    );

    if (this.heatmapAlpha > 0.005) {
      this.heatmapGroup.visible = true;
      const pulse = 0.92 + Math.sin(time * 2.6) * 0.08;
      this.heatmapPipeMat.opacity = this.heatmapAlpha * 0.42 * pulse;

      this.heatmapZoneVisuals.forEach((zv, idx) => {
        const isCurrentStep = zv.stepIndex === this.activeStepIndex;
        const boost = isCurrentStep ? 1.18 : 0.88;
        const zonePulse = 0.9 + Math.sin(time * 2.4 + idx * 0.9) * 0.1;

        zv.padMat.opacity = Math.min(0.95, this.heatmapAlpha * 0.78 * boost * zonePulse);
        zv.auraMat.opacity = Math.min(0.85, this.heatmapAlpha * 0.46 * boost * zonePulse);
        zv.ringMat.opacity = Math.min(0.95, this.heatmapAlpha * 0.72 * boost);

        // Gently scan the upper iso-thermal ring up and down the active unit
        const scanProgress = ((time * 0.35 + idx * 0.2) % 1);
        zv.ringUpper.position.y = 1.2 + scanProgress * (zv.baseHeight * 0.75);
      });
    } else if (!this.isHeatmapEnabled && this.heatmapGroup.visible) {
      this.heatmapGroup.visible = false;
    }

    // Animate Cryogenic pipeline flow particles
    const posAttr = this.particleGeo.attributes.position;
    for (let p = 0; p < this.particleCount; p++) {
      this.progressArray[p] = (this.progressArray[p] + dt * 0.085) % 1;
      const pt = this.mainPipeCurve.getPointAt(this.progressArray[p]);
      posAttr.setXYZ(p, pt.x, pt.y + 0.05, pt.z);
    }
    posAttr.needsUpdate = true;

    // Animate Fin-fan aerial coolers
    this.plant.animatedElements.coolers.forEach(fan => {
      fan.rotation.y += dt * 8.0;
    });

    // Animate Flare Flame flicker
    if (this.plant.animatedElements.flareFlame) {
      const scaleY = 1.0 + Math.sin(time * 12) * 0.15;
      const scaleXZ = 1.0 + Math.cos(time * 15) * 0.12;
      this.plant.animatedElements.flareFlame.scale.set(scaleXZ, scaleY, scaleXZ);
    }

    // Animate Tanker Radar scanner
    if (this.plant.animatedElements.radarMast) {
      this.plant.animatedElements.radarMast.rotation.y += dt * 3.5;
    }

    // Animate Hotspot pins bobbing
    this.hotspots.forEach((pin, i) => {
      const baseH = pin.userData.baseHeight || 18;
      pin.position.y = baseH + Math.sin(time * 3.0 + i) * 0.45;
      pin.lookAt(this.camera.position);
    });

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.animate);
    } else {
      this.animFrameId = requestAnimationFrame(this.animate);
    }
  };

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.animFrameId);
    window.removeEventListener('resize', this.onResize);

    this.hotspots.forEach(h => {
      h.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      });
    });

    if (this.heatmapGroup) {
      this.heatmapGroup.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }
    this.heatmapTextures.forEach(t => t.dispose());

    this.plant.root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.particleGeo.dispose();
    this.particleMat.dispose();

    if (this.scene.environment) {
      this.scene.environment.dispose();
    }

    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
