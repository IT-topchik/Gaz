import * as THREE from 'three';
import { MaterialPalette } from './materials';

export interface PlantBuildResult {
  root: THREE.Group;
  animatedElements: {
    coolers: THREE.Mesh[];
    flareFlame: THREE.Mesh;
    radarMast?: THREE.Mesh;
  };
  nightLights: THREE.Light[];
  nightGlowMeshes: THREE.Mesh[];
}

/**
 * CGTrader Free Refinery Kit — Modular Industrial Asset Builders
 * Implements authentic CAD geometry for:
 * - Torospherical dished end DIN 28011 pressure vessels (LatheGeometry)
 * - ASME B16.5 Class 150 Welding Neck Flanges with bolt rings
 * - Manual Valves & 3D Extended Gate Valves with rising stems & handwheels
 * - Flare Towers Brisbane Refinery (tapered 3D K-braced lattice derrick + molecular seal)
 * - LPG Storage Tank & Silo Lowpoly with staircase & stiffening rings
 * - Industrial Pipes Asset Pack (multi-tier expansion loops & manifold headers)
 * - Oil Drums / Rusted Barrels / Gastank metal bottles (InstancedMesh pallets)
 * - Refinery Building & Free Detailed Warehouse with pitched roof trusses & HVAC
 * - Refinery Ship / Tank Tanker (raked bow, bulbous bow, twin funnel, freefall lifeboats)
 */

function createDin28011VesselGeometry(radius: number, cylinderLen: number, radialSegs = 32): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [];
  const dishDepth = radius * 0.26;
  const halfLen = cylinderLen / 2;
  const steps = 10;

  // Bottom DIN 28011 torospherical head (from center axis x=0 to knuckle radius)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * (Math.PI / 2);
    const r = Math.sin(angle) * radius;
    const y = -halfLen - Math.cos(angle) * dishDepth;
    points.push(new THREE.Vector2(r, y));
  }

  // Main cylindrical shell with intermediate stiffening ring steps
  points.push(new THREE.Vector2(radius, 0));
  points.push(new THREE.Vector2(radius, halfLen));

  // Top DIN 28011 torospherical head
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const angle = (1 - t) * (Math.PI / 2);
    const r = Math.sin(angle) * radius;
    const y = halfLen + Math.cos(angle) * dishDepth;
    points.push(new THREE.Vector2(r, y));
  }

  const geo = new THREE.LatheGeometry(points, radialSegs);
  geo.computeVertexNormals();
  return geo;
}

function buildAsmeWeldNeckFlange(
  pipeRadius: number,
  materials: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  // Tapered welding neck hub
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 1.12, pipeRadius * 1.38, pipeRadius * 0.45, 16),
    materials.steelTruss
  );
  neck.position.y = pipeRadius * 0.22;
  // Bolted flange face ring
  const flangeDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 1.68, pipeRadius * 1.68, pipeRadius * 0.22, 18),
    materials.darkAccent
  );
  // Stud bolts around perimeter
  const boltRing = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 1.48, pipeRadius * 1.48, pipeRadius * 0.34, 8),
    materials.copperBrass
  );
  group.add(neck, flangeDisc, boltRing);
  return group;
}

function buildManualGateValve(
  scale: number,
  materials: MaterialPalette,
  isActuated = false
): THREE.Group {
  const vGroup = new THREE.Group();

  // Valve cast body + flanged ends
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32 * scale, 0.32 * scale, 0.75 * scale, 14),
    materials.darkAccent
  );
  body.rotation.z = Math.PI / 2;
  vGroup.add(body);

  const flangeL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48 * scale, 0.48 * scale, 0.1 * scale, 14),
    materials.steelTruss
  );
  flangeL.rotation.z = Math.PI / 2;
  flangeL.position.x = -0.38 * scale;
  const flangeR = flangeL.clone();
  flangeR.position.x = 0.38 * scale;
  vGroup.add(flangeL, flangeR);

  // Rising bonnet & yoke
  const bonnet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 0.85 * scale, 12),
    materials.darkAccent
  );
  bonnet.position.y = 0.42 * scale;
  vGroup.add(bonnet);

  // Threaded brass stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.7 * scale, 10),
    materials.copperBrass
  );
  stem.position.y = 0.95 * scale;
  vGroup.add(stem);

  // Red or Yellow industrial handwheel + spokes
  const wheelMat = isActuated ? materials.safetyYellow : materials.valveRed;
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.38 * scale, 0.055 * scale, 8, 18),
    wheelMat
  );
  wheelRim.rotation.x = Math.PI / 2;
  wheelRim.position.y = 1.15 * scale;
  vGroup.add(wheelRim);

  const spoke1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.72 * scale, 0.04 * scale, 0.05 * scale),
    wheelMat
  );
  spoke1.position.y = 1.15 * scale;
  const spoke2 = spoke1.clone();
  spoke2.rotation.y = Math.PI / 2;
  vGroup.add(spoke1, spoke2);

  return vGroup;
}

function buildSafetyCagedLadder(
  height: number,
  materials: MaterialPalette
): THREE.Group {
  const ladder = new THREE.Group();
  const railGeo = new THREE.BoxGeometry(0.06, height, 0.08);
  const railL = new THREE.Mesh(railGeo, materials.safetyYellow);
  railL.position.set(-0.26, height / 2, 0);
  const railR = new THREE.Mesh(railGeo, materials.safetyYellow);
  railR.position.set(0.26, height / 2, 0);
  ladder.add(railL, railR);

  // Rungs every 0.65m
  const rungGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.52, 6);
  rungGeo.rotateZ(Math.PI / 2);
  for (let y = 0.5; y < height; y += 0.65) {
    const rung = new THREE.Mesh(rungGeo, materials.steelTruss);
    rung.position.set(0, y, 0);
    ladder.add(rung);
  }

  // Safety hoops above 2.5m
  const hoopGeo = new THREE.TorusGeometry(0.42, 0.025, 6, 14, Math.PI * 1.35);
  hoopGeo.rotateX(Math.PI / 2);
  hoopGeo.rotateY(-Math.PI * 0.175);
  for (let y = 2.6; y < height - 0.3; y += 1.4) {
    const hoop = new THREE.Mesh(hoopGeo, materials.safetyYellow);
    hoop.position.set(0, y, 0.32);
    ladder.add(hoop);
  }

  // Vertical cage straps
  for (const angle of [-0.6, 0, 0.6]) {
    const strapH = Math.max(0.5, height - 2.6);
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, strapH, 0.04),
      materials.safetyYellow
    );
    strap.position.set(Math.sin(angle) * 0.42, 2.6 + strapH / 2, 0.32 + Math.cos(angle) * 0.42);
    ladder.add(strap);
  }

  return ladder;
}

/**
 * Builds an industrial orthogonal pipeline with 90-degree forged elbows and end flanges
 * so that pipes never float or curve away from vessel shells.
 */
function buildSegmentedPipeRun(
  points: THREE.Vector3[],
  radius: number,
  mat: THREE.Material,
  elbowMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0 || i === points.length - 1) {
      const collar = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.38, 14, 12),
        elbowMat
      );
      collar.position.copy(p);
      group.add(collar);
    } else {
      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.24, 14, 12),
        elbowMat
      );
      elbow.position.copy(p);
      group.add(elbow);
    }

    if (i < points.length - 1) {
      const next = points[i + 1];
      const dir = new THREE.Vector3().subVectors(next, p);
      const len = dir.length();
      if (len > 0.001) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, len, 14),
          mat
        );
        seg.position.copy(p).addScaledVector(dir, 0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        seg.castShadow = true;
        group.add(seg);
      }
    }
  }
  return group;
}

export function buildCompleteLngPlant(materials: MaterialPalette): PlantBuildResult {
  const root = new THREE.Group();
  const animatedCoolers: THREE.Mesh[] = [];
  const nightLights: THREE.Light[] = [];
  const nightGlowMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. TERRAIN, SEA WALL REVETMENT & ROADS
  // ==========================================
  const lowerBase = new THREE.Mesh(new THREE.BoxGeometry(274, 4.5, 164), materials.darkAccent);
  lowerBase.position.set(10, -4.4, 0);
  lowerBase.receiveShadow = true;
  root.add(lowerBase);

  // Land island (X: -120 to +46)
  const mainIsland = new THREE.Mesh(new THREE.BoxGeometry(166, 3.2, 136), materials.panelWhite);
  mainIsland.position.set(-37, -0.6, 0);
  mainIsland.receiveShadow = true;
  root.add(mainIsland);

  // Concrete Pavement with industrial expansion grid (Y=1.02)
  const pavement = new THREE.Mesh(new THREE.PlaneGeometry(164, 132), materials.concretePaving);
  pavement.rotation.x = -Math.PI / 2;
  pavement.position.set(-37, 1.02, 0);
  pavement.receiveShadow = true;
  root.add(pavement);

  // Perimeter Security Bund & Hazard Curbs
  const perimeterNorth = new THREE.Mesh(new THREE.BoxGeometry(164, 0.65, 0.8), materials.panelWhite);
  perimeterNorth.position.set(-37, 1.32, -66);
  const perimeterSouth = perimeterNorth.clone();
  perimeterSouth.position.z = 66;
  const perimeterWest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 132), materials.panelWhite);
  perimeterWest.position.set(-119, 1.32, 0);
  root.add(perimeterNorth, perimeterSouth, perimeterWest);

  // Internal road network (Y=1.05) with yellow safety shoulders
  for (let r = -50; r <= 50; r += 25) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(162, 5.2), materials.roadWay);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-37, 1.05, r);
    road.receiveShadow = true;
    root.add(road);

    for (let mx = -112; mx <= 40; mx += 9) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.26), materials.roadMarking);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(mx, 1.09, r);
      root.add(dash);
    }
  }

  // Cross arterial roads (Y=1.07)
  [-60, -25, 25].forEach((cx) => {
    const cr = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 118), materials.roadCrossWay);
    cr.rotation.x = -Math.PI / 2;
    cr.position.set(cx, 1.07, 0);
    cr.receiveShadow = true;
    root.add(cr);
  });

  // Harbor basin & Deep Water
  const shallowShelf = new THREE.Mesh(new THREE.BoxGeometry(13, 2.8, 136), materials.waterShallow);
  shallowShelf.position.set(52.5, -0.8, 0);
  shallowShelf.receiveShadow = true;
  shallowShelf.renderOrder = 1;
  root.add(shallowShelf);

  const deepWater = new THREE.Mesh(new THREE.BoxGeometry(82, 3.2, 136), materials.waterDeep);
  deepWater.position.set(100, -0.6, 0);
  deepWater.receiveShadow = true;
  deepWater.renderOrder = 1;
  root.add(deepWater);

  // Concrete Wharf Pier & Fender System (X from 46 to 59)
  const pierWharf = new THREE.Mesh(new THREE.BoxGeometry(13, 4.6, 102), materials.panelWhite);
  pierWharf.position.set(52.5, 1.2, 0);
  pierWharf.receiveShadow = true;
  pierWharf.castShadow = true;
  root.add(pierWharf);

  // Hazard safety edge stripe along pier edge
  const pierHazardEdge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 100), materials.hazardStripe);
  pierHazardEdge.position.set(58.5, 3.55, 0);
  root.add(pierHazardEdge);

  // Mooring Bollards & Heavy Rubber Dock Fenders
  for (let bz = -44; bz <= 44; bz += 8) {
    // Twin-horn cast iron mooring bollard
    const bollardBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 1.4), materials.darkAccent);
    bollardBase.position.set(57.6, 3.62, bz);
    const horn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.95, 12), materials.safetyYellow);
    horn1.position.set(57.6, 4.1, bz - 0.32);
    const horn2 = horn1.clone();
    horn2.position.z = bz + 0.32;
    root.add(bollardBase, horn1, horn2);

    // Cylindrical shock-absorbing marine fender on quay wall
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 2.4), materials.darkAccent);
    fender.position.set(59.2, 2.2, bz);
    root.add(fender);
  }

  // Soft Radial Contact Shadow under plant blocks
  const contactShadowMat = new THREE.MeshBasicMaterial({
    color: 0x050c18,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5
  });

  function addContactShadow(x: number, z: number, rx: number, rz: number) {
    const shadowGeo = new THREE.PlaneGeometry(rx * 2, rz * 2);
    const shadow = new THREE.Mesh(shadowGeo, contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 1.11, z);
    root.add(shadow);
  }

  // ==========================================
  // NODE 1: ВХОДНАЯ СЕПАРАЦИЯ И ОСУШКА
  // Incorporates CGTrader: "Torospherical dished end DIN28011",
  // "ASME B16-5 WELDING NECK FLANGE", "Manual Valve",
  // "3D VALVE GATE EXTENDED WITH UNDERGROUND", "Gastank metal bottle"
  // ==========================================
  const sepGroup = new THREE.Group();
  sepGroup.position.set(-38, 1.0, 0);
  addContactShadow(-38, 0, 15, 16);

  const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(25, 0.9, 27), materials.panelWhite);
  plinth1.position.y = 0.45;
  plinth1.receiveShadow = true;
  sepGroup.add(plinth1);

  const curbN = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.25, 0.35), materials.safetyYellow);
  curbN.position.set(0, 0.92, -13.4);
  const curbS = curbN.clone();
  curbS.position.z = 13.4;
  sepGroup.add(curbN, curbS);

  // 3 Horizontal 3-Phase DIN 28011 Separation Vessels with Boot Legs, Bridles & Manways
  const dinDrumGeo = createDin28011VesselGeometry(1.78, 10.2, 32);
  dinDrumGeo.rotateZ(Math.PI / 2);

  for (let i = 0; i < 3; i++) {
    const zP = -7.2 + i * 7.2;
    const drum = new THREE.Group();
    drum.position.set(-3.4, 3.8, zP);

    const vesselMesh = new THREE.Mesh(dinDrumGeo, materials.baseClay);
    vesselMesh.castShadow = true;
    vesselMesh.receiveShadow = true;
    drum.add(vesselMesh);

    // 4 Stiffening / insulation bands along vessel body
    for (const bx of [-3.8, -1.3, 1.3, 3.8]) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(1.83, 1.83, 0.22, 28),
        materials.darkAccent
      );
      band.rotation.z = Math.PI / 2;
      band.position.x = bx;
      drum.add(band);
    }

    // Blue DIN identification end-ring
    const endCollarL = new THREE.Mesh(
      new THREE.CylinderGeometry(1.81, 1.81, 0.65, 28),
      materials.gpBlue
    );
    endCollarL.rotation.z = Math.PI / 2;
    endCollarL.position.x = -4.6;
    const endCollarR = endCollarL.clone();
    endCollarR.position.x = 4.6;
    drum.add(endCollarL, endCollarR);

    // Heavy concrete/steel A-frame saddle piers
    for (const sx of [-3.4, 3.4]) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.7, 3.1), materials.darkAccent);
      saddle.position.set(sx, -2.0, 0);
      saddle.castShadow = true;
      drum.add(saddle);
    }

    // Water collection boot (settled liquid leg) under front end
    const bootLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 16), materials.baseClay);
    bootLeg.position.set(2.2, -1.9, 0);
    drum.add(bootLeg);

    // Side magnetic level gauge bridle assembly
    const bridlePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 10), materials.copperBrass);
    bridlePipe.position.set(-1.5, 0, 2.05);
    const bridleChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 12), materials.valveRed);
    bridleChamber.position.set(-1.5, 0, 2.25);
    drum.add(bridlePipe, bridleChamber);

    // Top ASME B16.5 flanged nozzles + manual valves + PSV relief loop
    for (const nx of [-2.8, 0, 2.8]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.85, 14), materials.steelTruss);
      nozzle.position.set(nx, 2.1, 0);
      drum.add(nozzle);

      const flange = buildAsmeWeldNeckFlange(0.26, materials);
      flange.position.set(nx, 2.45, 0);
      drum.add(flange);
    }

    const topValve = buildManualGateValve(1.15, materials, i === 1);
    topValve.position.set(0, 2.85, 0);
    drum.add(topValve);

    // Hinged inspection manway on front dished head
    const manway = buildAsmeWeldNeckFlange(0.45, materials);
    manway.rotation.z = -Math.PI / 2;
    manway.position.set(5.65, -0.2, 0);
    drum.add(manway);

    sepGroup.add(drum);
  }

  // Overhead shared steel service catwalk spanning across the 3 separator drums
  const sepCatwalk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 19.5), materials.steelGrating);
  sepCatwalk.position.set(-1.2, 6.1, 0);
  sepGroup.add(sepCatwalk);

  const sepRailL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 19.5), materials.safetyYellow);
  sepRailL.position.set(-2.25, 6.65, 0);
  const sepRailR = sepRailL.clone();
  sepRailR.position.x = -0.15;
  sepGroup.add(sepRailL, sepRailR);

  const sepLadder = buildSafetyCagedLadder(5.5, materials);
  sepLadder.position.set(-1.2, 0.9, 10.1);
  sepGroup.add(sepLadder);

  // Underground Extended Gate Valve Pit ("3D VALVE GATE EXTENDED WITH UNDERGROUND")
  const valvePit = new THREE.Group();
  valvePit.position.set(-9.5, 0.9, -9.8);
  const pitCoaming = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 4.2), materials.darkAccent);
  pitCoaming.position.y = 0.22;
  const pitGrating = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.8), materials.steelGrating);
  pitGrating.rotation.x = -Math.PI / 2;
  pitGrating.position.y = 0.46;
  valvePit.add(pitCoaming, pitGrating);

  for (const vz of [-1.0, 1.0]) {
    const extColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.4, 12), materials.gpBlue);
    extColumn.position.set(0, 1.4, vz);
    const actuatorBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), materials.darkAccent);
    actuatorBox.position.set(0, 2.6, vz);
    const sideWheel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 16), materials.valveRed);
    sideWheel.rotation.y = Math.PI / 2;
    sideWheel.position.set(0.38, 2.6, vz);
    valvePit.add(extColumn, actuatorBox, sideWheel);
  }
  sepGroup.add(valvePit);

  // 2 Vertical Zeolite Molecular Sieve Adsorption Towers with Switching Manifold Skids
  const towerVesselGeo = createDin28011VesselGeometry(2.15, 13.5, 32);
  for (let j = 0; j < 2; j++) {
    const zC = -4.5 + j * 9.0;
    const tower = new THREE.Group();
    tower.position.set(6.4, 0.9, zC);

    // Cylindrical steel skirt base with access opening
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.25, 3.2, 28), materials.darkAccent);
    skirt.position.y = 1.6;
    skirt.castShadow = true;
    tower.add(skirt);

    const vessel = new THREE.Mesh(towerVesselGeo, materials.baseClay);
    vessel.position.y = 9.8;
    vessel.castShadow = true;
    tower.add(vessel);

    // Welded insulation bands & Gazprom Blue top identification collar
    for (let by = 4.5; by <= 15.0; by += 2.6) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.18, 28),
        by > 13 ? materials.gpBlue : materials.steelTruss
      );
      band.position.y = by;
      tower.add(band);
    }

    // External downcomer & regeneration gas header pipe with 90-deg elbows entering dome & skirt
    const towerPipe = buildSegmentedPipeRun(
      [
        new THREE.Vector3(0, 16.6, 0),
        new THREE.Vector3(0, 17.55, 0),
        new THREE.Vector3(-2.65, 17.55, 0),
        new THREE.Vector3(-2.65, 2.2, 0),
        new THREE.Vector3(-1.85, 2.2, 0)
      ],
      0.26,
      materials.steelTruss,
      materials.darkAccent
    );
    tower.add(towerPipe);

    // 3 Circular grated maintenance platforms with safety yellow handrails & vertical stanchions
    for (const pY of [5.2, 10.2, 15.2]) {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.22, 24), materials.steelGrating);
      plat.position.y = pY;
      tower.add(plat);

      const railTop = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.055, 8, 24), materials.safetyYellow);
      railTop.rotation.x = Math.PI / 2;
      railTop.position.y = pY + 0.95;
      const railMid = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.04, 8, 24), materials.safetyYellow);
      railMid.rotation.x = Math.PI / 2;
      railMid.position.y = pY + 0.48;
      tower.add(railTop, railMid);

      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.98, 6), materials.safetyYellow);
        post.position.set(Math.cos(ang) * 3.13, pY + 0.48, Math.sin(ang) * 3.13);
        tower.add(post);
      }
    }

    const towerLadder = buildSafetyCagedLadder(15.4, materials);
    towerLadder.rotation.y = Math.PI / 2;
    towerLadder.position.set(3.25, 0, 0);
    tower.add(towerLadder);

    sepGroup.add(tower);
  }

  // Feed gas collector manifold connecting the 3 horizontal separator drums to the adsorption towers
  const sepManifold = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-3.4, 6.25, -7.2),
      new THREE.Vector3(-3.4, 7.2, -7.2),
      new THREE.Vector3(-3.4, 7.2, 7.2),
      new THREE.Vector3(-3.4, 6.25, 7.2)
    ],
    0.26,
    materials.gpBlue,
    materials.darkAccent
  );
  const sepMidTie = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-3.4, 6.25, 0),
      new THREE.Vector3(-3.4, 7.2, 0),
      new THREE.Vector3(6.4, 7.2, 0),
      new THREE.Vector3(6.4, 7.2, -4.5),
      new THREE.Vector3(6.4, 5.2, -4.5)
    ],
    0.26,
    materials.gpBlue,
    materials.darkAccent
  );
  const sepSouthTie = buildSegmentedPipeRun(
    [
      new THREE.Vector3(6.4, 7.2, 0),
      new THREE.Vector3(6.4, 7.2, 4.5),
      new THREE.Vector3(6.4, 5.2, 4.5)
    ],
    0.26,
    materials.gpBlue,
    materials.darkAccent
  );
  sepGroup.add(sepManifold, sepMidTie, sepSouthTie);

  // High-pressure Nitrogen & Calibration Gas Bottle Rack ("Gastank metal bottle")
  const bottleRack = new THREE.Group();
  bottleRack.position.set(6.4, 0.9, 0);
  const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.2), materials.steelTruss);
  rackFrame.position.y = 1.2;
  bottleRack.add(rackFrame);
  for (let bx = -0.8; bx <= 0.8; bx += 0.52) {
    for (let bz = -1.0; bz <= 1.0; bz += 0.65) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.9, 12), materials.gpCyan);
      bottle.position.set(bx, 1.0, bz);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.25, 10), materials.copperBrass);
      neck.position.set(bx, 2.05, bz);
      bottleRack.add(bottle, neck);
    }
  }
  sepGroup.add(bottleRack);

  root.add(sepGroup);

  // ==========================================
  // NODE 2: РЕКТИФИКАЦИЯ И ФРАКЦИОНИРОВАНИЕ
  // Incorporates CGTrader: "Industrial Platform", "Silo Lowpoly",
  // "Industrial Pipes Asset Pack", Kettle Reboilers & Reflux Drums
  // ==========================================
  const fracGroup = new THREE.Group();
  fracGroup.position.set(-12, 1.0, 0);
  addContactShadow(-12, 0, 14, 17);

  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(24, 0.9, 30), materials.panelWhite);
  plinth2.position.y = 0.45;
  plinth2.receiveShadow = true;
  fracGroup.add(plinth2);

  const colSpecs = [
    { name: 'Deethanizer', r: 2.15, h: 29, x: -4.8, z: -5.2 },
    { name: 'Depropanizer', r: 1.85, h: 24, x: -4.8, z: 4.8 },
    { name: 'Debutanizer', r: 1.55, h: 20, x: 4.5, z: -5.5 }
  ];

  colSpecs.forEach((s, idx) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(s.x, 0.9, s.z);

    // Flared base skirt
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(s.r * 0.96, s.r * 1.12, 3.6, 28),
      materials.darkAccent
    );
    skirt.position.y = 1.8;
    skirt.castShadow = true;
    colGroup.add(skirt);

    // Column vessel with DIN 28011 heads
    const colVesselGeo = createDin28011VesselGeometry(s.r, s.h - 4.5, 32);
    const body = new THREE.Mesh(colVesselGeo, materials.baseClay);
    body.position.y = s.h / 2 + 1.2;
    body.castShadow = true;
    colGroup.add(body);

    // Tray stiffening rings & manhole nozzles along column height
    for (let y = 5.0; y < s.h - 1.0; y += 3.2) {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(s.r + 0.07, s.r + 0.07, 0.18, 28),
        y > s.h - 5 ? materials.gpBlue : materials.steelTruss
      );
      ring.position.y = y;
      colGroup.add(ring);
    }

    // Exact top apex of DIN 28011 dome: body.y + (s.h - 4.5)/2 + s.r * 0.26 = s.h - 1.05 + s.r * 0.26
    const domeApexY = s.h - 1.05 + s.r * 0.26;
    const dropX = s.r + 0.85;

    // Overhead vapor gooseneck line rising directly out of top dome apex and descending to base/reboiler
    const overheadVaporPipe = buildSegmentedPipeRun(
      [
        new THREE.Vector3(0, domeApexY - 0.35, 0),
        new THREE.Vector3(0, domeApexY + 0.65, 0),
        new THREE.Vector3(dropX, domeApexY + 0.65, 0),
        new THREE.Vector3(dropX, 2.2, 0),
        new THREE.Vector3(s.r * 0.75, 2.2, 0)
      ],
      0.24,
      materials.steelTruss,
      materials.darkAccent
    );
    colGroup.add(overheadVaporPipe);

    // Top reflux return nozzle connecting vertical drop pipe directly into upper column shell
    const refluxNozzle = buildSegmentedPipeRun(
      [
        new THREE.Vector3(dropX, s.h - 2.8, 0),
        new THREE.Vector3(s.r * 0.78, s.h - 2.8, 0)
      ],
      0.2,
      materials.gpCyan,
      materials.darkAccent
    );
    colGroup.add(refluxNozzle);

    // Multi-tier grated platforms, handrails & vertical stanchion posts
    for (let lvl = 5.5; lvl < s.h; lvl += 5.2) {
      const platR = s.r + 1.05;
      const plat = new THREE.Mesh(
        new THREE.CylinderGeometry(platR, platR, 0.22, 24),
        materials.steelGrating
      );
      plat.position.y = lvl;
      colGroup.add(plat);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(platR, 0.055, 8, 24),
        materials.safetyYellow
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.y = lvl + 0.9;
      colGroup.add(rail);

      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 6), materials.safetyYellow);
        post.position.set(Math.cos(ang) * (platR - 0.02), lvl + 0.45, Math.sin(ang) * (platR - 0.02));
        colGroup.add(post);
      }
    }

    // Caged safety ladder
    const colLadder = buildSafetyCagedLadder(s.h - 1.5, materials);
    colLadder.position.set(0, 0, s.r + 1.15);
    colGroup.add(colLadder);

    // Adjacent Kettle Reboiler & Reflux Drum at base of each column + Thermosyphon Connecting Pipes
    const reboiler = new THREE.Group();
    const rebX = idx === 2 ? 0 : 5.4;
    const rebZ = idx === 2 ? 5.6 : 0;
    reboiler.position.set(rebX, 2.2, rebZ);

    const rebBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 4.8, 20),
      idx === 0 ? materials.gpBlue : materials.baseClay
    );
    rebBody.rotation.z = Math.PI / 2;
    rebBody.castShadow = true;
    const rebHead = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.9, 20),
      materials.darkAccent
    );
    rebHead.rotation.z = Math.PI / 2;
    rebHead.position.x = 2.4;
    const rebSaddle1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 1.8), materials.darkAccent);
    rebSaddle1.position.set(-1.5, -1.3, 0);
    const rebSaddle2 = rebSaddle1.clone();
    rebSaddle2.position.x = 1.5;
    reboiler.add(rebBody, rebHead, rebSaddle1, rebSaddle2);
    colGroup.add(reboiler);

    // Connect column shell to Kettle Reboiler with Liquid Feed + Vapor Return Thermosyphon Pipes
    if (idx !== 2) {
      const rebFeedPipe = buildSegmentedPipeRun(
        [
          new THREE.Vector3(s.r * 0.75, 2.2, 0),
          new THREE.Vector3(rebX - 2.2, 2.2, 0)
        ],
        0.24,
        materials.steelTruss,
        materials.darkAccent
      );
      const rebVaporReturn = buildSegmentedPipeRun(
        [
          new THREE.Vector3(rebX + 0.4, 2.9, 0),
          new THREE.Vector3(rebX + 0.4, 4.3, 0),
          new THREE.Vector3(s.r * 0.82, 4.3, 0)
        ],
        0.26,
        materials.gpBlue,
        materials.darkAccent
      );
      colGroup.add(rebFeedPipe, rebVaporReturn);
    } else {
      const rebFeedPipeZ = buildSegmentedPipeRun(
        [
          new THREE.Vector3(0, 2.2, s.r * 0.75),
          new THREE.Vector3(0, 2.2, rebZ - 0.8)
        ],
        0.24,
        materials.steelTruss,
        materials.darkAccent
      );
      const rebVaporReturnZ = buildSegmentedPipeRun(
        [
          new THREE.Vector3(0, 2.9, rebZ),
          new THREE.Vector3(0, 4.3, rebZ),
          new THREE.Vector3(0, 4.3, s.r * 0.82)
        ],
        0.26,
        materials.gpBlue,
        materials.darkAccent
      );
      colGroup.add(rebFeedPipeZ, rebVaporReturnZ);
    }

    fracGroup.add(colGroup);
  });

  // Inter-column overhead process transfer headers connecting Deethanizer -> Depropanizer -> Debutanizer
  const interColHeader1 = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-4.8, 5.2, -5.2),
      new THREE.Vector3(-4.8, 5.2, 4.8)
    ],
    0.24,
    materials.gpCyan,
    materials.darkAccent
  );
  const interColHeader2 = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-4.8, 5.2, -5.2),
      new THREE.Vector3(4.5, 5.2, -5.5)
    ],
    0.24,
    materials.gpBlue,
    materials.darkAccent
  );
  fracGroup.add(interColHeader1, interColHeader2);

  // Heavy structural steel lattice superstructure ("Industrial Platform")
  const trussFrame = new THREE.Group();
  const frameX = [-9.2, -0.5, 8.2];
  const frameZ = [-10.5, 0, 10.5];
  frameX.forEach((tx) => {
    frameZ.forEach((tz) => {
      const colPost = new THREE.Mesh(new THREE.BoxGeometry(0.38, 22, 0.38), materials.steelTruss);
      colPost.position.set(tx, 11.9, tz);
      colPost.castShadow = true;
      trussFrame.add(colPost);
    });
  });

  for (let ty = 5.5; ty <= 22; ty += 5.5) {
    for (const tz of frameZ) {
      const beamX = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.34, 0.34), materials.steelTruss);
      beamX.position.set(-0.5, ty, tz);
      trussFrame.add(beamX);
    }
    for (const tx of frameX) {
      const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 21.2), materials.steelTruss);
      beamZ.position.set(tx, ty + 0.05, 0);
      trussFrame.add(beamZ);
    }
    // Diagonal K-bracing on outer bays
    const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 11.8, 8), materials.steelTruss);
    diag.rotation.x = Math.PI / 3.1;
    diag.position.set(8.2, ty - 2.75, -5.25);
    const diag2 = diag.clone();
    diag2.rotation.x = -Math.PI / 3.1;
    diag2.position.z = 5.25;
    trussFrame.add(diag, diag2);
  }
  fracGroup.add(trussFrame);
  root.add(fracGroup);

  // ==========================================
  // NODE 3: ОСНОВНОЙ БЛОК СЖИЖЕНИЯ (MCHE)
  // Incorporates CGTrader: "Factory with chimneys", "refinery building",
  // Spirally Wound MCHE Cryogenic Tower + Fin-Fan Aerial Coolers
  // ==========================================
  const liqGroup = new THREE.Group();
  liqGroup.position.set(12, 1.0, 0);
  addContactShadow(12, 0, 15, 17);

  const plinth3 = new THREE.Mesh(new THREE.BoxGeometry(27, 0.9, 30), materials.panelWhite);
  plinth3.position.y = 0.45;
  plinth3.receiveShadow = true;
  liqGroup.add(plinth3);

  // MCHE Cryogenic Tower (Multi-Stage Spirally Wound Heat Exchanger)
  const mcheGroup = new THREE.Group();
  mcheGroup.position.set(-4.8, 0.9, -2.2);

  // Concrete & steel blast-resistant base pedestal
  const mchePedestal = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.6, 4.2, 32), materials.darkAccent);
  mchePedestal.position.y = 2.1;
  mchePedestal.castShadow = true;
  mcheGroup.add(mchePedestal);

  // Lower Warm Bundle Shell (larger diameter)
  const mcheLower = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 11.5, 36), materials.baseClay);
  mcheLower.position.y = 9.95;
  mcheLower.castShadow = true;
  mcheGroup.add(mcheLower);

  // Conical transition reducer
  const mcheReducer = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 4.1, 2.2, 36), materials.gpBlue);
  mcheReducer.position.y = 16.8;
  mcheReducer.castShadow = true;
  mcheGroup.add(mcheReducer);

  // Upper Cold Bundle Shell
  const mcheUpper = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.35, 8.2, 36), materials.baseClay);
  mcheUpper.position.y = 22.0;
  mcheUpper.castShadow = true;
  mcheGroup.add(mcheUpper);

  // Top Torospherical Dished Head
  const mcheDome = new THREE.Mesh(
    new THREE.SphereGeometry(3.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.gpBlue
  );
  mcheDome.position.y = 26.1;
  mcheDome.castShadow = true;
  mcheGroup.add(mcheDome);

  // Heavy bolted girth flanges & mixed-refrigerant external distribution headers
  for (const fy of [6.0, 12.0, 15.7, 17.9, 23.5]) {
    const r = fy > 16.5 ? 3.55 : 4.32;
    const girthFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.36, 36),
      materials.darkAccent
    );
    girthFlange.position.y = fy;
    mcheGroup.add(girthFlange);
  }

  // External Mixed Refrigerant (MR) vertical manifold risers with top & intermediate nozzles entering MCHE shells
  for (const angle of [0.6, 2.1, -1.8]) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rx = cosA * 4.55;
    const rz = sinA * 4.55;

    // Main vertical riser connected at base pedestal (y=2.2) and entering Upper Cold Bundle shell (y=21.8)
    const mrRiserRun = buildSegmentedPipeRun(
      [
        new THREE.Vector3(cosA * 3.4, 2.2, sinA * 3.4),
        new THREE.Vector3(rx, 2.2, rz),
        new THREE.Vector3(rx, 21.8, rz),
        new THREE.Vector3(cosA * 2.85, 21.8, sinA * 2.85)
      ],
      0.34,
      materials.panelWhite,
      materials.darkAccent
    );
    mcheGroup.add(mrRiserRun);

    // Intermediate Warm Bundle injection nozzle entering Lower MCHE shell (y=14.2, r=4.1)
    const mrMidNozzle = buildSegmentedPipeRun(
      [
        new THREE.Vector3(rx, 14.2, rz),
        new THREE.Vector3(cosA * 3.5, 14.2, sinA * 3.5)
      ],
      0.28,
      materials.gpCyan,
      materials.darkAccent
    );
    mcheGroup.add(mrMidNozzle);

    const mrValve = buildManualGateValve(1.2, materials, true);
    mrValve.position.set(rx, 5.2, rz);
    mcheGroup.add(mrValve);
  }

  // Top MCHE Dome Cryogenic LNG Outlet Header descending from dome apex black junction sphere (0, 29.55, 0) to base manifold
  const mcheTopOutlet = buildSegmentedPipeRun(
    [
      new THREE.Vector3(0, 28.9, 0),
      new THREE.Vector3(0, 29.55, 0),
      new THREE.Vector3(0, 29.55, 3.95),
      new THREE.Vector3(0, 2.8, 3.95),
      new THREE.Vector3(0, 2.8, 2.2)
    ],
    0.3,
    materials.gpCyan,
    materials.darkAccent
  );
  mcheGroup.add(mcheTopOutlet);

  // 4-Tier 360-degree grated service catwalks, safety yellow railings & vertical stanchion posts
  for (const levelY of [6.8, 12.8, 18.8, 24.8]) {
    const platR = levelY > 17 ? 4.45 : 5.15;
    const catwalk = new THREE.Mesh(
      new THREE.CylinderGeometry(platR, platR, 0.24, 36),
      materials.steelGrating
    );
    catwalk.position.y = levelY;
    mcheGroup.add(catwalk);

    const guardRail = new THREE.Mesh(
      new THREE.TorusGeometry(platR, 0.06, 8, 36),
      materials.safetyYellow
    );
    guardRail.rotation.x = Math.PI / 2;
    guardRail.position.y = levelY + 0.92;
    mcheGroup.add(guardRail);

    for (let p = 0; p < 12; p++) {
      const ang = (p / 12) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.94, 6), materials.safetyYellow);
      post.position.set(Math.cos(ang) * (platR - 0.03), levelY + 0.46, Math.sin(ang) * (platR - 0.03));
      mcheGroup.add(post);
    }
  }

  // Industrial Hoist / Elevator Lattice Tower alongside MCHE connected to top catwalk
  const mcheShaft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 25.0, 1.4), materials.steelTruss);
  mcheShaft.position.set(-4.8, 12.5, 0);
  mcheShaft.castShadow = true;
  const mcheShaftCap = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 1.65), materials.darkAccent);
  mcheShaftCap.position.set(-4.8, 25.1, 0);
  mcheGroup.add(mcheShaft, mcheShaftCap);

  // Top yellow line/boom rising from mcheShaftCap (-4.8, 25.1, 0) to (-4.8, 29.55, 0) and entering directly into the black sphere at (0, 29.55, 0)
  const craneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.6, 16), materials.darkAccent);
  craneBase.position.set(-4.8, 25.4, 0);

  const topDomeJunctionSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 20, 20),
    materials.darkAccent
  );
  topDomeJunctionSphere.position.set(0, 29.55, 0);
  topDomeJunctionSphere.castShadow = true;

  const topYellowRun = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-4.8, 25.2, 0),
      new THREE.Vector3(-4.8, 29.55, 0),
      new THREE.Vector3(0, 29.55, 0)
    ],
    0.26,
    materials.safetyYellow,
    materials.darkAccent
  );

  // Diagonal structural knee-brace from (-4.8, 27.7, 0) to (-2.95, 29.55, 0)
  const craneBrace = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-4.8, 27.7, 0),
      new THREE.Vector3(-2.95, 29.55, 0)
    ],
    0.12,
    materials.safetyYellow,
    materials.darkAccent
  );

  mcheGroup.add(craneBase, topDomeJunctionSphere, topYellowRun, craneBrace);

  liqGroup.add(mcheGroup);

  // Overhead Mixed-Refrigerant (MR) High-Pressure Transfer Bridges between Compressor Hall & MCHE Tower
  const mrBridgeHigh = buildSegmentedPipeRun(
    [
      new THREE.Vector3(1.2, 8.2, -4.5),
      new THREE.Vector3(-4.8, 8.2, -4.5),
      new THREE.Vector3(-4.8, 8.2, -2.2)
    ],
    0.34,
    materials.gpBlue,
    materials.darkAccent
  );
  const mrBridgeLow = buildSegmentedPipeRun(
    [
      new THREE.Vector3(1.2, 6.4, 2.2),
      new THREE.Vector3(-4.8, 6.4, 2.2),
      new THREE.Vector3(-4.8, 6.4, -2.2)
    ],
    0.32,
    materials.panelWhite,
    materials.darkAccent
  );
  // Tie-in from MCHE & Compressor Hall directly into the Main Overhead Pipe Rack (World Z=0, Y=3.8)
  const mcheToMainRack = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-4.8, 2.8, -2.2),
      new THREE.Vector3(-4.8, 2.8, 0)
    ],
    0.38,
    materials.panelWhite,
    materials.darkAccent
  );
  liqGroup.add(mrBridgeHigh, mrBridgeLow, mcheToMainRack);

  // Turbo-Compressor Hall ("Factory with chimneys" & "refinery building")
  const compHallGroup = new THREE.Group();
  compHallGroup.position.set(6.5, 0.9, 0);

  // Corrugated steel turbine hall body
  const compBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(13.2, 9.2, 22.0),
    materials.corrugatedSteel
  );
  compBuilding.position.y = 4.6;
  compBuilding.castShadow = true;
  compBuilding.receiveShadow = true;
  compHallGroup.add(compBuilding);

  // Structural steel portal frame columns along facade
  for (let pz = -10.5; pz <= 10.5; pz += 3.5) {
    const pilasterL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9.4, 0.45), materials.darkAccent);
    pilasterL.position.set(-6.65, 4.7, pz);
    const pilasterR = pilasterL.clone();
    pilasterR.position.x = 6.65;
    compHallGroup.add(pilasterL, pilasterR);
  }

  // Blue architectural fascia band at roofline
  const roofFascia = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.85, 22.4), materials.gpBlue);
  roofFascia.position.y = 9.2;
  compHallGroup.add(roofFascia);

  // Industrial Gas Turbine Air Intake Filter Houses & Exhaust Chimneys ("Factory with chimneys")
  for (const tz of [-6.5, 6.5]) {
    // Stepped air filter intake housing on east wall
    const filterHouse = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 4.4), materials.panelWhite);
    filterHouse.position.set(7.8, 4.8, tz);
    filterHouse.castShadow = true;
    const filterLouvers = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 3.6), materials.darkAccent);
    filterLouvers.position.set(9.35, 4.8, tz);
    compHallGroup.add(filterHouse, filterLouvers);

    // Tall stainless turbine exhaust stack with acoustic silencer & aviation warning bands
    const exhaustSilencer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 4.2, 20), materials.darkAccent);
    exhaustSilencer.position.set(3.8, 11.4, tz);
    const exhaustStack = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.92, 8.5, 20), materials.steelTruss);
    exhaustStack.position.set(3.8, 16.5, tz);
    exhaustStack.castShadow = true;
    const redBand = new THREE.Mesh(new THREE.CylinderGeometry(0.81, 0.83, 1.1, 20), materials.valveRed);
    redBand.position.set(3.8, 19.6, tz);
    compHallGroup.add(exhaustSilencer, exhaustStack, redBand);
  }

  // Control room observation bay & Roll-up maintenance doors
  const compGlassWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 3.2), materials.cryoGlass);
  compGlassWall.position.set(0, 6.2, 11.08);
  compGlassWall.renderOrder = 2;
  compHallGroup.add(compGlassWall);

  const rollDoor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.25), materials.darkAccent);
  rollDoor.position.set(0, 2.1, 11.05);
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.45, 0.35), materials.hazardStripe);
  doorHeader.position.set(0, 4.35, 11.08);
  compHallGroup.add(rollDoor, doorHeader);

  // 6 Fin-Fan Aerial Coolers (ACHE bank) mounted on elevated steel frame on roof
  for (let c = 0; c < 6; c++) {
    const cx = -3.0 + (c % 2) * 3.8;
    const cz = -7.2 + Math.floor(c / 2) * 7.2;

    const coolerPlenum = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 5.2), materials.gpBlue);
    coolerPlenum.position.set(cx, 10.6, cz);
    coolerPlenum.castShadow = true;
    compHallGroup.add(coolerPlenum);

    const fanShroud = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.55, 20), materials.darkAccent);
    fanShroud.position.set(cx, 11.5, cz);
    compHallGroup.add(fanShroud);

    // Crossed 4-blade industrial impeller
    const fanAssembly = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.32), materials.safetyYellow);
    const bladeCross = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 2.2), materials.safetyYellow);
    fanAssembly.add(bladeCross);
    fanAssembly.position.set(cx, 11.72, cz);
    compHallGroup.add(fanAssembly);
    animatedCoolers.push(fanAssembly);
  }

  liqGroup.add(compHallGroup);
  root.add(liqGroup);

  // ==========================================
  // NODE 4: ИЗОТЕРМИЧЕСКИЙ ПАРК РЕЗЕРВУАРОВ СПГ
  // Incorporates CGTrader: "Oil Tank", "Silo Lowpoly",
  // "LPG Storage Tank Low-Poly 3D Model", "Modular Fuel Tank"
  // ==========================================
  const tankGroup = new THREE.Group();
  tankGroup.position.set(38, 1.0, -2);
  addContactShadow(38, -2, 16, 22);

  for (let t = 0; t < 2; t++) {
    const zT = t === 0 ? -13.5 : 13.5;
    const tHolder = new THREE.Group();
    tHolder.position.set(0, 0, zT);

    // Outer prestressed concrete full-containment wall
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 14.5, 48), materials.panelWhite);
    tBase.position.y = 7.25;
    tBase.castShadow = true;
    tBase.receiveShadow = true;
    tHolder.add(tBase);

    // 16 Vertical concrete buttress pilasters around perimeter ("Oil Tank" / Full-Containment CAD detail)
    for (let b = 0; b < 16; b++) {
      const ang = (b / 16) * Math.PI * 2;
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.55, 14.4, 0.55), materials.baseClay);
      pilaster.position.set(Math.cos(ang) * 9.42, 7.2, Math.sin(ang) * 9.42);
      pilaster.rotation.y = -ang;
      pilaster.castShadow = true;
      tHolder.add(pilaster);
    }

    // Horizontal post-tensioning wind girder rings
    for (const wy of [4.5, 9.0, 13.8]) {
      const windGirder = new THREE.Mesh(
        new THREE.TorusGeometry(9.52, 0.16, 8, 48),
        materials.steelTruss
      );
      windGirder.rotation.x = Math.PI / 2;
      windGirder.position.y = wy;
      tHolder.add(windGirder);
    }

    // Domed geodesic roof with full hemisphere base sitting flush on concrete wall at Y=14.5
    const tDome = new THREE.Mesh(
      new THREE.SphereGeometry(9.4, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.baseClay
    );
    tDome.scale.y = 0.52;
    tDome.position.y = 14.5;
    tDome.castShadow = true;
    tHolder.add(tDome);

    // Gazprom Brand Blue identification band
    const stripeMat = materials.gpBlue.clone();
    stripeMat.polygonOffset = true;
    stripeMat.polygonOffsetFactor = -1;
    stripeMat.polygonOffsetUnits = -1;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(9.48, 9.48, 1.25, 48, 1, true),
      stripeMat
    );
    stripe.position.y = 11.6;
    tHolder.add(stripe);

    // Roof Pump Platform supported by 4 steel legs anchored deep into the tank dome
    const roofPlatform = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 4.2), materials.steelGrating);
    roofPlatform.position.set(0, 19.1, 0);
    tHolder.add(roofPlatform);

    for (const [lx, lz] of [[-2.4, -1.7], [2.4, -1.7], [-2.4, 1.7], [2.4, 1.7]]) {
      const platLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 10), materials.steelTruss);
      platLeg.position.set(lx, 18.0, lz);
      tHolder.add(platLeg);
    }

    for (const px of [-1.6, 0, 1.6]) {
      // Extend pump column down to y=17.0 so it penetrates solidly through roofPlatform into the dome
      const pumpColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 5.2, 16), materials.gpBlue);
      pumpColumn.position.set(px, 19.5, 0);
      pumpColumn.castShadow = true;
      const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.35, 16), materials.darkAccent);
      baseFlange.position.set(px, 19.35, 0);
      const pumpMotorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.9, 16), materials.darkAccent);
      pumpMotorHead.position.set(px, 22.1, 0);
      const psvValve = buildManualGateValve(0.85, materials, true);
      psvValve.position.set(px, 22.6, 0);
      tHolder.add(pumpColumn, baseFlange, pumpMotorHead, psvValve);
    }

    // External Spiral Stairway & Vertical Elevator Tower ("Silo Lowpoly" / "Oil Tank")
    const serviceTower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 19.3, 1.5), materials.steelTruss);
    serviceTower.position.set(-10.1, 9.65, 0);
    serviceTower.castShadow = true;
    tHolder.add(serviceTower);

    // Roof access catwalk bridge from roofPlatform (x=0) to serviceTower (x=-10.1) with intermediate dome support struts
    const topBridge = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.34, 1.4), materials.steelGrating);
    topBridge.position.set(-5.0, 19.1, 0);
    const bridgeRailL = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.75, 0.06), materials.safetyYellow);
    bridgeRailL.position.set(-5.0, 19.55, 0.64);
    const bridgeRailR = bridgeRailL.clone();
    bridgeRailR.position.z = -0.64;
    tHolder.add(topBridge, bridgeRailL, bridgeRailR);

    for (const bx of [-4.6, -7.5]) {
      const bridgeStrut = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.8, 0.9), materials.steelTruss);
      bridgeStrut.position.set(bx, 17.4, 0);
      const pipeShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.24), materials.steelTruss);
      pipeShoe.position.set(bx, 19.75, 0);
      tHolder.add(bridgeStrut, pipeShoe);
    }

    // Cryogenic LNG Roof Collector Manifold running straight through all 3 pump columns (z=0, y=20.45),
    // supported along topBridge, descending inside serviceTower (x=-10.1), and connecting into Main Pipe Rack (World Z=0, Y=3.8)
    const rackLocalZ = -zT + 2.0;
    const lngTankHeader = buildSegmentedPipeRun(
      [
        new THREE.Vector3(1.6, 20.45, 0),
        new THREE.Vector3(-10.1, 20.45, 0),
        new THREE.Vector3(-10.1, 2.8, 0),
        new THREE.Vector3(-10.1, 2.8, rackLocalZ)
      ],
      0.32,
      materials.panelWhite,
      materials.darkAccent
    );
    tHolder.add(lngTankHeader);

    // Boil-Off Gas (BOG) Vapor Recovery Line rising out of dome through roofPlatform, running along topBridge,
    // descending down serviceTower, and connecting into Main Pipe Rack BOG Header
    const bogTankHeader = buildSegmentedPipeRun(
      [
        new THREE.Vector3(0.8, 17.8, -0.45),
        new THREE.Vector3(0.8, 19.65, -0.45),
        new THREE.Vector3(-10.1, 19.65, -0.45),
        new THREE.Vector3(-10.1, 2.8, -0.45),
        new THREE.Vector3(-10.1, 2.8, rackLocalZ + 0.95)
      ],
      0.24,
      materials.gpCyan,
      materials.darkAccent
    );
    tHolder.add(bogTankHeader);

    // Ground T-stanchion supporting the horizontal tank-to-rack cryogenic pipeline
    const tankPipeSupport = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.32), materials.steelTruss);
    tankPipeSupport.position.set(-10.1, 1.3, rackLocalZ * 0.5);
    tHolder.add(tankPipeSupport);

    // Secondary containment bund dike wall around each tank
    const bundMat = materials.panelWhite.clone();
    bundMat.side = THREE.DoubleSide;
    const bund = new THREE.Mesh(new THREE.CylinderGeometry(11.9, 12.2, 2.5, 48, 1, true), bundMat);
    bund.position.y = 1.25;
    bund.castShadow = true;
    tHolder.add(bund);

    tankGroup.add(tHolder);
  }

  // Horizontal Bullet LPG Storage Tank Skid ("LPG Storage Tank Low-Poly 3D Model") with Orthogonal Main Rack Tie-In
  const lpgBulletGroup = new THREE.Group();
  lpgBulletGroup.position.set(-8.8, 0, -4.6);

  const lpgSkidPad = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.45, 8.8), materials.panelWhite);
  lpgSkidPad.position.y = 0.22;
  lpgSkidPad.receiveShadow = true;
  lpgBulletGroup.add(lpgSkidPad);

  const bulletGeo = createDin28011VesselGeometry(1.45, 6.8, 24);
  bulletGeo.rotateX(Math.PI / 2);
  for (const bx of [-2.1, 2.1]) {
    const bullet = new THREE.Mesh(bulletGeo, materials.panelWhite);
    bullet.position.set(bx, 2.5, 0);
    bullet.castShadow = true;
    const band1 = new THREE.Mesh(new THREE.CylinderGeometry(1.49, 1.49, 0.35, 24), materials.gpCyan);
    band1.rotation.x = Math.PI / 2;
    band1.position.set(bx, 2.5, -2.0);
    const band2 = band1.clone();
    band2.position.z = 2.0;
    const saddleA = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 0.6), materials.darkAccent);
    saddleA.position.set(bx, 1.0, -2.2);
    const saddleB = saddleA.clone();
    saddleB.position.z = 2.2;
    lpgBulletGroup.add(bullet, band1, band2, saddleA, saddleB);
  }

  // Orthogonal manifold connecting both LPG bullets directly into the Main Overhead Pipe Rack (local Z = +6.6 -> World Z = 0, local Y = 2.8 -> World Y = 3.8)
  const lpgManifold = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-2.1, 3.4, 1.8),
      new THREE.Vector3(-2.1, 4.35, 1.8),
      new THREE.Vector3(2.1, 4.35, 1.8),
      new THREE.Vector3(2.1, 3.4, 1.8)
    ],
    0.2,
    materials.gpCyan,
    materials.darkAccent
  );
  const lpgRackTie = buildSegmentedPipeRun(
    [
      new THREE.Vector3(0, 4.35, 1.8),
      new THREE.Vector3(0, 4.35, 4.6),
      new THREE.Vector3(0, 2.8, 4.6),
      new THREE.Vector3(0, 2.8, 6.6)
    ],
    0.22,
    materials.safetyYellow,
    materials.darkAccent
  );
  lpgBulletGroup.add(lpgManifold, lpgRackTie);
  tankGroup.add(lpgBulletGroup);

  root.add(tankGroup);

  // ==========================================
  // NODE 5: МОРСКОЙ ТЕРМИНАЛ И ТАНКЕР-ГАЗОВОЗ
  // Incorporates CGTrader: "Refinery Ship", "Tank Tanker",
  // Articulated Cryogenic Marine Loading Arms (Chiksan Standers)
  // ==========================================
  const termGroup = new THREE.Group();
  termGroup.position.set(0, 0, 0);

  // Elevated Jetty Control Tower & Gangway Bridge on Pier
  const jettyTower = new THREE.Group();
  jettyTower.position.set(50.5, 3.5, -24);
  const jtLegs = new THREE.Mesh(new THREE.BoxGeometry(3.6, 8.5, 3.6), materials.steelTruss);
  jtLegs.position.y = 4.25;
  const jtCab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 5.2), materials.panelWhite);
  jtCab.position.y = 9.8;
  jtCab.castShadow = true;
  const jtGlass = new THREE.Mesh(new THREE.BoxGeometry(5.35, 1.8, 5.35), materials.cryoGlass);
  jtGlass.position.y = 10.0;
  jtGlass.renderOrder = 2;
  const jtRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.45, 5.8), materials.gpBlue);
  jtRoof.position.y = 11.7;
  jettyTower.add(jtLegs, jtCab, jtGlass, jtRoof);
  termGroup.add(jettyTower);

  // 4 Articulated Marine Cryogenic Loading Arms (3 Liquid + 1 Vapor Return)
  const loadingArmGroup = new THREE.Group();
  const standerPositionsZ = [-10.5, -3.5, 3.5, 10.5];

  standerPositionsZ.forEach((zPos, idx) => {
    const station = new THREE.Group();
    station.position.set(54.2, 3.4, zPos);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 2.0), materials.darkAccent);
    pedestal.position.y = 0.32;
    pedestal.castShadow = true;
    station.add(pedestal);

    const towerHeight = 8.6;
    const riser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.52, towerHeight, 20),
      idx === 2 ? materials.safetyYellow : materials.gpBlue
    );
    riser.position.y = 0.65 + towerHeight / 2;
    riser.castShadow = true;
    station.add(riser);

    const apexY = 0.65 + towerHeight;

    // Triple swivel joint & pantograph counterweight boom
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), materials.darkAccent);
    joint.position.set(0, apexY, 0);
    station.add(joint);

    const cwBoom = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.45), materials.steelTruss);
    cwBoom.position.set(-1.6, apexY + 0.4, 0);
    const cWeight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), materials.valveRed);
    cWeight.position.set(-2.8, apexY + 0.4, 0);
    station.add(cwBoom, cWeight);

    // Articulated inboard arm + pantograph cable
    const inArmLen = 6.0;
    const inAngle = Math.PI / 5.0;
    const inPivot = new THREE.Group();
    inPivot.position.set(0, apexY, 0);
    inPivot.rotation.z = -inAngle;

    const inArm = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, inArmLen, 16), materials.panelWhite);
    inArm.position.y = inArmLen / 2;
    inArm.castShadow = true;
    const pantograph = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, inArmLen, 8), materials.steelTruss);
    pantograph.position.set(-0.45, inArmLen / 2, 0);
    inPivot.add(inArm, pantograph);
    station.add(inPivot);

    const elbowX = Math.sin(inAngle) * inArmLen;
    const elbowY = apexY + Math.cos(inAngle) * inArmLen;
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), materials.darkAccent);
    elbowJoint.position.set(elbowX, elbowY, 0);
    station.add(elbowJoint);

    // Outboard loading arm reaching ship manifold
    const outArmLen = 7.6;
    const outAngle = Math.PI / 3.15;
    const outPivot = new THREE.Group();
    outPivot.position.set(elbowX, elbowY, 0);
    outPivot.rotation.z = -(Math.PI - outAngle);

    const outArm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, outArmLen, 16), materials.panelWhite);
    outArm.position.y = outArmLen / 2;
    outArm.castShadow = true;
    outPivot.add(outArm);

    // PERC / QCDC Emergency Quick-Disconnect Coupler
    const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.1, 16), materials.valveRed);
    coupler.position.set(0, outArmLen, 0);
    outPivot.add(coupler);

    station.add(outPivot);
    loadingArmGroup.add(station);
  });

  // Jetty Cryogenic Manifold Header connecting the Main Overhead Pipe Rack (54, 3.8, 0) directly into all 4 Loading Arm Standers
  const jettyHeader = buildSegmentedPipeRun(
    [
      new THREE.Vector3(54.2, 3.8, -10.5),
      new THREE.Vector3(54.2, 3.8, 10.5)
    ],
    0.42,
    materials.panelWhite,
    materials.darkAccent
  );
  // Tie-in connecting upper rack pipes (Y=4.85, Z=±0.55) directly down into the Jetty Manifold Header
  const jettyUpperTie = buildSegmentedPipeRun(
    [
      new THREE.Vector3(53.8, 4.85, -0.55),
      new THREE.Vector3(54.2, 4.85, -0.55),
      new THREE.Vector3(54.2, 4.85, 0.55),
      new THREE.Vector3(53.8, 4.85, 0.55)
    ],
    0.26,
    materials.safetyYellow,
    materials.darkAccent
  );
  const jettyUpperDrop = buildSegmentedPipeRun(
    [
      new THREE.Vector3(54.2, 4.85, 0),
      new THREE.Vector3(54.2, 3.8, 0)
    ],
    0.28,
    materials.safetyYellow,
    materials.darkAccent
  );
  loadingArmGroup.add(jettyHeader, jettyUpperTie, jettyUpperDrop);

  termGroup.add(loadingArmGroup);

  // ==========================================
  // ARCTIC LNG CARRIER ("Refinery Ship" / "Tank Tanker" CAD Upgrade)
  // ==========================================
  const shipGroup = new THREE.Group();
  shipGroup.position.set(74, 1.0, 0);

  // Sculpted Ship Hull with Raked Icebreaker Bow, Transom Stern & Anti-Fouling Boot Top
  const hullShape = new THREE.Shape();
  // Coordinates in ship plan (X = beam width -9.6..+9.6, Y = length -37..+36)
  hullShape.moveTo(0, -39.5); // Sharp icebreaker bow stem
  hullShape.quadraticCurveTo(9.8, -31.0, 9.8, -16.0);
  hullShape.lineTo(9.8, 25.0);
  hullShape.quadraticCurveTo(9.8, 34.5, 6.2, 36.5);
  hullShape.lineTo(-6.2, 36.5);
  hullShape.quadraticCurveTo(-9.8, 34.5, -9.8, 25.0);
  hullShape.lineTo(-9.8, -16.0);
  hullShape.quadraticCurveTo(-9.8, -31.0, 0, -39.5);

  const upperHullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 5.2,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.35,
    bevelThickness: 0.35
  });
  upperHullGeo.rotateX(Math.PI / 2);

  const upperHull = new THREE.Mesh(upperHullGeo, materials.darkAccent);
  upperHull.position.y = 7.0;
  upperHull.castShadow = true;
  upperHull.receiveShadow = true;
  shipGroup.add(upperHull);

  // Red anti-fouling lower boot-top waterline belt
  const lowerHullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 2.4,
    bevelEnabled: false
  });
  lowerHullGeo.rotateX(Math.PI / 2);
  const lowerHull = new THREE.Mesh(lowerHullGeo, materials.shipHullRed);
  lowerHull.scale.set(0.985, 1, 0.99);
  lowerHull.position.y = 1.9;
  shipGroup.add(lowerHull);

  // Bulbous Ice-Knife Bow Nose
  const bulbBow = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 16), materials.shipHullRed);
  bulbBow.scale.set(0.85, 0.85, 2.2);
  bulbBow.position.set(0, 1.2, -39.2);
  shipGroup.add(bulbBow);

  // Green non-slip Marine Weather Deck
  const deckGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.25,
    bevelEnabled: false
  });
  deckGeo.rotateX(Math.PI / 2);
  const shipDeck = new THREE.Mesh(deckGeo, materials.shipDeck);
  shipDeck.scale.set(0.94, 1, 0.96);
  shipDeck.position.y = 7.42;
  shipGroup.add(shipDeck);

  // Raised Forecastle Deck at Bow with Anchor Windlasses & Mooring Winches
  const forecastle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 8.8, 2.2, 4, 1), materials.panelWhite);
  forecastle.rotation.y = Math.PI / 4;
  forecastle.scale.set(0.9, 1, 1.35);
  forecastle.position.set(0, 8.2, -31.5);
  shipGroup.add(forecastle);

  // 4 Spherical Kvaerner-Moss Cryogenic Cargo Tanks with Cylindrical Skirts & Longitudinal Flying Passageway
  for (let m = 0; m < 4; m++) {
    const tankZ = -22.5 + m * 13.8;

    // Heavy steel cylindrical support skirt welded to deck
    const tankSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(5.15, 5.35, 3.8, 36),
      materials.gpBlue
    );
    tankSkirt.position.set(0, 9.2, tankZ);
    tankSkirt.castShadow = true;
    shipGroup.add(tankSkirt);

    // Upper hemispherical aluminum/steel cargo cover
    const tankDome = new THREE.Mesh(
      new THREE.SphereGeometry(5.15, 36, 24),
      materials.panelWhite
    );
    tankDome.position.set(0, 10.8, tankZ);
    tankDome.castShadow = true;
    shipGroup.add(tankDome);

    // Equatorial structural ring & top pump cupola dome
    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(5.22, 0.22, 10, 36), materials.gpCyan);
    eqRing.rotation.x = Math.PI / 2;
    eqRing.position.set(0, 11.1, tankZ);
    shipGroup.add(eqRing);

    const topCupola = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.2, 2.4), materials.steelTruss);
    topCupola.position.set(0, 16.0, tankZ);
    shipGroup.add(topCupola);
  }

  // Longitudinal Overhead Cryogenic Cargo Header & Catwalk spanning all 4 spherical domes
  const shipCatwalk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 48.0), materials.steelGrating);
  shipCatwalk.position.set(0, 16.65, -2.0);
  shipGroup.add(shipCatwalk);

  for (const px of [-0.6, 0.6]) {
    const cargoHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 49.0, 14), materials.panelWhite);
    cargoHeader.rotation.x = Math.PI / 2;
    cargoHeader.position.set(px, 17.15, -2.0);
    shipGroup.add(cargoHeader);
  }

  // Port-side Cryogenic Manifold Platform & Midship Hose Handling Davit Cranes
  const shipManifold = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 22.0), materials.steelTruss);
  shipManifold.position.set(-8.6, 8.2, 0);
  shipGroup.add(shipManifold);

  for (const cz of [-12.5, 12.5]) {
    const cranePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.8, 14), materials.safetyYellow);
    cranePedestal.position.set(-7.8, 9.2, cz);
    const craneJib = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 6.5), materials.safetyYellow);
    craneJib.position.set(-7.8, 11.2, cz + (cz < 0 ? 2.5 : -2.5));
    shipGroup.add(cranePedestal, craneJib);
  }

  // Multi-Tiered Stern Accommodation Superstructure & Bridge Wings
  const superTier1 = new THREE.Mesh(new THREE.BoxGeometry(15.6, 3.6, 10.5), materials.panelWhite);
  superTier1.position.set(0, 9.2, 27.5);
  superTier1.castShadow = true;
  const superTier2 = new THREE.Mesh(new THREE.BoxGeometry(13.8, 3.2, 8.8), materials.panelWhite);
  superTier2.position.set(0, 12.6, 27.2);
  superTier2.castShadow = true;
  const superTier3 = new THREE.Mesh(new THREE.BoxGeometry(11.8, 2.6, 7.2), materials.baseClay);
  superTier3.position.set(0, 15.5, 26.8);
  superTier3.castShadow = true;
  shipGroup.add(superTier1, superTier2, superTier3);

  // Full-Beam Navigation Bridge with Cantilevered Port/Starboard Look-Out Wings
  const navBridge = new THREE.Mesh(new THREE.BoxGeometry(20.6, 2.4, 4.2), materials.panelWhite);
  navBridge.position.set(0, 17.8, 24.8);
  navBridge.castShadow = true;
  shipGroup.add(navBridge);

  const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(20.75, 1.25, 4.32), materials.cryoGlass);
  bridgeGlass.position.set(0, 18.0, 24.8);
  bridgeGlass.renderOrder = 2;
  shipGroup.add(bridgeGlass);

  // Orange Freefall Lifeboats on Stern Davits
  for (const lx of [-8.2, 8.2]) {
    const lifeboat = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.4, 12), materials.safetyYellow);
    lifeboat.rotation.x = Math.PI / 2.6;
    lifeboat.position.set(lx, 11.5, 32.8);
    shipGroup.add(lifeboat);
  }

  // Twin Funnels (Casings) with Gazprom Blue Band & Exhaust Uptakes
  for (const fx of [-3.4, 3.4]) {
    const funnelCasing = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 4.8, 18), materials.gpBlue);
    funnelCasing.scale.set(0.85, 1, 1.35);
    funnelCasing.position.set(fx, 18.8, 29.5);
    funnelCasing.castShadow = true;
    const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.8, 18), materials.darkAccent);
    funnelCap.scale.set(0.85, 1, 1.35);
    funnelCap.position.set(fx, 21.4, 29.5);
    shipGroup.add(funnelCasing, funnelCap);
  }

  // Radar Mast, Satcom Radomes & Rotating X-Band Scanner on Bridge Roof
  const radarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 1.2, 16), materials.darkAccent);
  radarBase.position.set(0, 19.6, 24.8);
  const radarColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 3.2, 12), materials.steelTruss);
  radarColumn.position.set(0, 21.6, 24.8);
  shipGroup.add(radarBase, radarColumn);

  for (const sx of [-2.4, 2.4]) {
    const satDome = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 14), materials.panelWhite);
    satDome.position.set(sx, 19.8, 24.8);
    shipGroup.add(satDome);
  }

  const radarMast = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 0.42), materials.safetyYellow);
  radarMast.position.set(0, 23.3, 24.8);
  shipGroup.add(radarMast);

  termGroup.add(shipGroup);
  root.add(termGroup);

  // ==========================================
  // INFRASTRUCTURE 1: BRISBANE REFINERY DERRICK FLARE TOWER
  // Incorporates CGTrader: "Flare Towers Brisbane Refinery"
  // ==========================================
  const flareGroup = new THREE.Group();
  flareGroup.position.set(-78, 1.0, -32);
  addContactShadow(-78, -32, 9, 9);

  const flarePad = new THREE.Mesh(new THREE.BoxGeometry(15, 0.7, 15), materials.panelWhite);
  flarePad.position.y = 0.35;
  flarePad.receiveShadow = true;
  flareGroup.add(flarePad);

  // Horizontal Flare Knock-Out (KO) Drum at Base of Derrick
  const koDrumGeo = createDin28011VesselGeometry(1.35, 6.8, 24);
  koDrumGeo.rotateZ(Math.PI / 2);
  const koDrum = new THREE.Mesh(koDrumGeo, materials.baseClay);
  koDrum.position.set(3.5, 2.5, 3.8);
  koDrum.castShadow = true;
  const koSaddle1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 2.1), materials.darkAccent);
  koSaddle1.position.set(1.5, 1.2, 3.8);
  const koSaddle2 = koSaddle1.clone();
  koSaddle2.position.x = 5.5;
  // Overhead gas transfer line from KO Drum top shell directly into the central Flare Riser
  const koToRiserPipe = buildSegmentedPipeRun(
    [
      new THREE.Vector3(2.2, 3.5, 3.8),
      new THREE.Vector3(2.2, 4.8, 3.8),
      new THREE.Vector3(0, 4.8, 3.8),
      new THREE.Vector3(0, 4.8, 0)
    ],
    0.34,
    materials.safetyYellow,
    materials.darkAccent
  );
  flareGroup.add(koDrum, koSaddle1, koSaddle2, koToRiserPipe);

  // 4-Corner Tapered Structural Lattice Derrick ("Flare Towers Brisbane Refinery")
  const derrickHeight = 33.0;
  const baseSpread = 3.2;
  const topSpread = 1.15;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ];

  corners.forEach(([cx, cz]) => {
    const start = new THREE.Vector3(cx * baseSpread, 0.7, cz * baseSpread);
    const end = new THREE.Vector3(cx * topSpread, derrickHeight, cz * topSpread);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, len, 10), materials.steelTruss);
    leg.position.copy(start).addScaledVector(dir, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    leg.castShadow = true;
    flareGroup.add(leg);
  });

  // Horizontal & Diagonal Lattice Tiers + 3 Circular Aviation Rest Platforms
  const tiers = 7;
  for (let t = 1; t <= tiers; t++) {
    const frac = t / tiers;
    const y = 0.7 + frac * (derrickHeight - 0.7);
    const halfW = THREE.MathUtils.lerp(baseSpread, topSpread, frac);

    // 4 horizontal girts
    const girtX1 = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.18, 0.18), materials.steelTruss);
    girtX1.position.set(0, y, -halfW);
    const girtX2 = girtX1.clone();
    girtX2.position.z = halfW;
    const girtZ1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, halfW * 2), materials.steelTruss);
    girtZ1.position.set(-halfW, y, 0);
    const girtZ2 = girtZ1.clone();
    girtZ2.position.x = halfW;
    flareGroup.add(girtX1, girtX2, girtZ1, girtZ2);

    if (t % 2 === 0 || t === tiers) {
      const plat = new THREE.Mesh(
        new THREE.CylinderGeometry(halfW * 1.48, halfW * 1.48, 0.2, 20),
        materials.steelGrating
      );
      plat.position.y = y;
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(halfW * 1.48, 0.05, 8, 20),
        t === tiers ? materials.valveRed : materials.safetyYellow
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.y = y + 0.8;
      flareGroup.add(plat, rail);
    }
  }

  // Central Flare Riser Pipe, Molecular Seal Drum & Steam-Assisted Flare Tip Burner
  const flareRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 34.5, 18), materials.darkAccent);
  flareRiser.position.y = 18.0;
  flareRiser.castShadow = true;
  flareGroup.add(flareRiser);

  const molecularSeal = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.8, 20), materials.gpBlue);
  molecularSeal.position.y = 32.0;
  flareGroup.add(molecularSeal);

  const flareTip = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.62, 2.4, 18), materials.steelTruss);
  flareTip.position.y = 35.6;
  flareGroup.add(flareTip);

  // Dynamic Multi-Core Procedural Flame
  const flameGeo = new THREE.ConeGeometry(1.15, 4.4, 16);
  const flareFlame = new THREE.Mesh(flameGeo, materials.flareGlow);
  flareFlame.position.y = 38.4;
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.58, 2.6, 12), materials.glowNightLight);
  innerFlame.position.y = -0.5;
  flareFlame.add(innerFlame);
  flareGroup.add(flareFlame);

  root.add(flareGroup);

  // ==========================================
  // INFRASTRUCTURE 2: WAREHOUSE, DRUM YARD & SILO CLUSTER
  // Incorporates CGTrader: "Free Detailed Warehouse", "Silo Lowpoly",
  // "Barrel", "Oil Drum", "Rusted Oil Drum", "Barrel two rusty barrels"
  // ==========================================
  const logisticsYard = new THREE.Group();
  logisticsYard.position.set(-76, 1.0, 26);
  addContactShadow(-76, 26, 18, 14);

  const yardPlinth = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 26), materials.panelWhite);
  yardPlinth.position.y = 0.25;
  yardPlinth.receiveShadow = true;
  logisticsYard.add(yardPlinth);

  // "Free Detailed Warehouse" — Pitched-Roof Corrugated Maintenance & Chemical Warehouse
  const warehouse = new THREE.Group();
  warehouse.position.set(-5.5, 0.5, 0);

  const whBody = new THREE.Mesh(new THREE.BoxGeometry(18.0, 6.8, 16.0), materials.corrugatedSteel);
  whBody.position.y = 3.4;
  whBody.castShadow = true;
  whBody.receiveShadow = true;
  warehouse.add(whBody);

  // Gabled pitched roof prism
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-9.4, 0);
  roofShape.lineTo(0, 2.6);
  roofShape.lineTo(9.4, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 16.6, bevelEnabled: false });
  const whRoof = new THREE.Mesh(roofGeo, materials.gpBlue);
  whRoof.position.set(0, 6.8, -8.3);
  whRoof.castShadow = true;
  warehouse.add(whRoof);

  // Rooftop HVAC units & ventilation skylights
  for (const hz of [-4.5, 4.5]) {
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.8), materials.panelWhite);
    hvac.position.set(0, 9.6, hz);
    warehouse.add(hvac);
  }

  // 3 Loading Bay Roll-Up Doors with Hazard Dock Bumpers
  for (const dz of [-5.0, 0, 5.0]) {
    const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 3.2), materials.darkAccent);
    bayDoor.position.set(9.02, 1.9, dz);
    const bayHeader = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 3.4), materials.hazardStripe);
    bayHeader.position.set(9.05, 3.95, dz);
    warehouse.add(bayDoor, bayHeader);
  }
  logisticsYard.add(warehouse);

  // "Silo Lowpoly" Cluster — 2 Vertical Zeolite & Catalyst Storage Silos on Conical Hoppers
  for (let s = 0; s < 2; s++) {
    const silo = new THREE.Group();
    silo.position.set(11.5, 0.5, -5.5 + s * 7.5);

    // 4 Support legs
    for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 10), materials.steelTruss);
      leg.position.set(lx, 2.1, lz);
      silo.add(leg);
    }

    // Conical discharge hopper
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.45, 2.8, 24), materials.gpBlue);
    hopper.position.y = 3.2;
    silo.add(hopper);

    // Cylindrical silo body + conical roof
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 8.5, 24), materials.baseClay);
    siloBody.position.y = 8.85;
    siloBody.castShadow = true;
    const siloCap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.6, 24), materials.panelWhite);
    siloCap.position.y = 13.9;
    const baghouseFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 14), materials.gpCyan);
    baghouseFilter.position.y = 15.2;
    silo.add(siloBody, siloCap, baghouseFilter);

    const siloLadder = buildSafetyCagedLadder(13.2, materials);
    siloLadder.position.set(-2.55, 0, 0);
    silo.add(siloLadder);

    logisticsYard.add(silo);
  }

  // InstancedMesh Oil Drums, Chemical Barrels & Rusted Oil Drums ("Barrel", "Oil Drum", "Rusted Oil Drum")
  const drumSpots: Array<{ x: number; z: number; y: number; type: 'blue' | 'rust' | 'yellow' }> = [];
  // Pallets near warehouse loading dock
  for (let px = 5.2; px <= 7.8; px += 1.3) {
    for (let pz = -7.0; pz <= 7.0; pz += 1.1) {
      if (Math.abs(pz) < 1.8) continue;
      drumSpots.push({
        x: -76 + px,
        y: 1.95,
        z: 26 + pz,
        type: pz < 0 ? 'blue' : 'rust'
      });
    }
  }
  // Pallets near Node 1 separation & Node 2 fractionation maintenance pads
  for (let i = 0; i < 12; i++) {
    drumSpots.push({
      x: -47.5 + (i % 4) * 0.92,
      y: 2.35,
      z: -10.5 + Math.floor(i / 4) * 0.92,
      type: i % 3 === 0 ? 'yellow' : i % 2 === 0 ? 'blue' : 'rust'
    });
  }

  const drumGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.08, 14);
  const drumInstanced = new THREE.InstancedMesh(drumGeo, materials.panelWhite, drumSpots.length);
  drumInstanced.castShadow = true;
  drumInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const cBlue = new THREE.Color(0x0058e6);
  const cRust = new THREE.Color(0x8c4222);
  const cYellow = new THREE.Color(0xf59e0b);

  drumSpots.forEach((d, idx) => {
    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.updateMatrix();
    drumInstanced.setMatrixAt(idx, dummy.matrix);
    drumInstanced.setColorAt(
      idx,
      d.type === 'blue' ? cBlue : d.type === 'yellow' ? cYellow : cRust
    );
  });
  drumInstanced.instanceMatrix.needsUpdate = true;
  if (drumInstanced.instanceColor) drumInstanced.instanceColor.needsUpdate = true;
  drumInstanced.computeBoundingSphere();
  root.add(drumInstanced);

  root.add(logisticsYard);

  // ==========================================
  // CRYOGENIC OVERHEAD PIPE RACK ("Industrial Pipes Asset Pack")
  // Multi-Tier Steel Portal Bents + 5 Color-Coded Process Lines + Thermal Expansion U-Loops
  // ==========================================
  const pipePoints = [
    new THREE.Vector3(-38, 3.8, 0),
    new THREE.Vector3(-12, 3.8, 0),
    new THREE.Vector3(12, 3.8, 0),
    new THREE.Vector3(38, 3.8, 0),
    new THREE.Vector3(54, 3.8, 0)
  ];

  // Primary 42" Insulated Cryogenic LNG Header
  const mainPipeCurve = new THREE.CatmullRomCurve3(pipePoints);
  const mainPipeGeo = new THREE.TubeGeometry(mainPipeCurve, 100, 0.52, 16, false);
  const mainPipeMesh = new THREE.Mesh(mainPipeGeo, materials.panelWhite);
  mainPipeMesh.castShadow = true;
  root.add(mainPipeMesh);

  // Secondary parallel process pipelines on the 2-tier rack
  const parallelPipes = [
    { offsetY: 0.0, offsetZ: -0.95, radius: 0.34, mat: materials.gpBlue },
    { offsetY: 0.0, offsetZ: 0.95, radius: 0.32, mat: materials.gpCyan },
    { offsetY: 1.05, offsetZ: -0.55, radius: 0.28, mat: materials.safetyYellow },
    { offsetY: 1.05, offsetZ: 0.55, radius: 0.24, mat: materials.valveRed }
  ];

  parallelPipes.forEach((pp) => {
    const pts = pipePoints.map((p) => new THREE.Vector3(p.x, p.y + pp.offsetY, p.z + pp.offsetZ));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 80, pp.radius, 12, false);
    const mesh = new THREE.Mesh(geo, pp.mat);
    mesh.castShadow = true;
    root.add(mesh);
  });

  // Thermal Expansion U-Loops between major process blocks with 90-degree forged elbows & outrigger T-supports
  for (const loopX of [-25, 0, 25]) {
    const uLoopRun = buildSegmentedPipeRun(
      [
        new THREE.Vector3(loopX - 2.1, 4.85, -0.55),
        new THREE.Vector3(loopX - 2.1, 4.85, -3.1),
        new THREE.Vector3(loopX + 2.1, 4.85, -3.1),
        new THREE.Vector3(loopX + 2.1, 4.85, -0.55)
      ],
      0.28,
      materials.gpCyan,
      materials.darkAccent
    );
    root.add(uLoopRun);

    // Outrigger T-stanchion support under each thermal expansion U-loop so it never hangs in mid-air
    const loopPost = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.55, 0.26), materials.steelTruss);
    loopPost.position.set(loopX, 2.78, -3.1);
    const loopCrossBar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.26, 0.36), materials.steelTruss);
    loopCrossBar.position.set(loopX, 4.44, -3.1);
    root.add(loopPost, loopCrossBar);
  }

  // Orthogonal Branch Tie-Ins from Main Overhead Pipe Rack into Node 1 & Node 2 columns
  const node1TieIn = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-31.6, 3.8, 0),
      new THREE.Vector3(-31.6, 3.8, -4.5)
    ],
    0.32,
    materials.gpBlue,
    materials.darkAccent
  );
  const node2TieNorth = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-16.8, 3.8, 0),
      new THREE.Vector3(-16.8, 3.8, -5.2)
    ],
    0.32,
    materials.gpBlue,
    materials.darkAccent
  );
  const node2TieSouth = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-16.8, 3.8, 0),
      new THREE.Vector3(-16.8, 3.8, 4.8)
    ],
    0.3,
    materials.gpCyan,
    materials.darkAccent
  );
  const node2TieEast = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-7.5, 3.8, 0),
      new THREE.Vector3(-7.5, 3.8, -5.5)
    ],
    0.28,
    materials.panelWhite,
    materials.darkAccent
  );
  root.add(node1TieIn, node2TieNorth, node2TieSouth, node2TieEast);

  // Orthogonal Flare Header Line connecting main rack (-38, 4.85, -0.55) to Flare KO Drum (-74.5, 3.5, -28.2)
  const flareHeaderRun = buildSegmentedPipeRun(
    [
      new THREE.Vector3(-38, 4.85, -0.55),
      new THREE.Vector3(-62, 4.85, -0.55),
      new THREE.Vector3(-62, 4.85, -28.2),
      new THREE.Vector3(-70.8, 4.85, -28.2),
      new THREE.Vector3(-70.8, 3.5, -28.2),
      new THREE.Vector3(-74.5, 3.5, -28.2)
    ],
    0.34,
    materials.safetyYellow,
    materials.darkAccent
  );
  root.add(flareHeaderRun);

  // Steel T-Stanchions supporting the Flare Header Line along its entire route
  const flareStanchions: Array<[number, number]> = [
    [-46, -0.55],
    [-54, -0.55],
    [-62, -0.55],
    [-62, -10.0],
    [-62, -19.0],
    [-62, -28.2],
    [-68, -28.2]
  ];
  flareStanchions.forEach(([sx, sz]) => {
    const sPost = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.5, 0.26), materials.steelTruss);
    sPost.position.set(sx, 2.75, sz);
    const sCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.9), materials.steelTruss);
    sCap.position.set(sx, 4.39, sz);
    root.add(sPost, sCap);
  });

  // Structural Multi-Tier Portal Bents with Gussets & ASME Pipe Shoes
  // Lower pipes at Y=3.8 (r=0.34..0.52) sit flush on lowerBeam (World Y=3.26, top at 3.42)
  // Upper pipes at Y=4.85 (r=0.24..0.28) sit flush on upperBeam (World Y=4.45, top at 4.59)
  for (let px = -36; px <= 52; px += 6.2) {
    const bent = new THREE.Group();
    bent.position.set(px, 1.0, 0);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.1, 0.28), materials.steelTruss);
    legL.position.set(0, 2.05, -1.65);
    legL.castShadow = true;
    const legR = legL.clone();
    legR.position.z = 1.65;

    const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 3.7), materials.steelTruss);
    lowerBeam.position.set(0, 2.26, 0);

    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 3.5), materials.steelTruss);
    upperBeam.position.set(0, 3.45, 0);

    // Knee braces supporting lowerBeam
    const braceL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.18), materials.safetyYellow);
    braceL.rotation.x = Math.PI / 4;
    braceL.position.set(0, 1.9, -1.25);
    const braceR = braceL.clone();
    braceR.rotation.x = -Math.PI / 4;
    braceR.position.z = 1.25;

    bent.add(legL, legR, lowerBeam, upperBeam, braceL, braceR);
    root.add(bent);
  }

  // ==========================================
  // NIGHT LIGHTING POSTS & INDUSTRIAL FLOODLIGHT TOWERS
  // ==========================================
  const lightPostCoords = [
    [-38, 13], [-38, -13],
    [-12, 14], [-12, -14],
    [12, 15], [12, -15],
    [38, 17], [38, -17],
    [54, 22], [54, -22],
    [70, 26], [70, -26],
    [-72, 10], [-72, -18]
  ];

  lightPostCoords.forEach(([lx, lz]) => {
    const post = new THREE.Group();
    post.position.set(lx, 1.0, lz);

    const basePedestal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), materials.hazardStripe);
    basePedestal.position.y = 0.3;
    post.add(basePedestal);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.2, 10), materials.steelTruss);
    pole.position.y = 3.9;
    post.add(pole);

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.22), materials.darkAccent);
    crossBar.position.set(0.35, 7.4, 0);
    post.add(crossBar);

    const luminaire = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.35), materials.glowNightLight);
    luminaire.position.set(0.68, 7.3, 0);
    post.add(luminaire);
    nightGlowMeshes.push(luminaire);

    const pl = new THREE.PointLight(0xffeedd, 0, 28, 1.5);
    pl.position.set(0.68, 7.0, 0);
    post.add(pl);
    nightLights.push(pl);

    root.add(post);
  });

  return {
    root,
    animatedElements: {
      coolers: animatedCoolers,
      flareFlame,
      radarMast
    },
    nightLights,
    nightGlowMeshes
  };
}
