/**
 * sakotis.js — procedural Šakotis (Lithuanian tree cake) for Three.js
 * ------------------------------------------------------------------
 * Returns a THREE.Group you can drop straight into your own scene.
 *
 * Usage:
 *   import * as THREE from 'three';
 *   import { createSakotis } from './sakotis.js';
 *
 *   const cake = createSakotis(THREE, { height: 6.5, seed: 7 });
 *   cake.scale.setScalar(0.3);          // resize to taste
 *   cake.position.set(x, groundY, z);   // group origin (y=0) is the board's underside
 *   scene.add(cake);
 *
 * Notes:
 *  - Uses MeshStandardMaterial, so your scene needs lights.
 *  - THREE is passed in, so it works with whatever version / loader you use
 *    (npm 'three', a CDN global, an import map — all fine).
 *  - Same `seed` → identical cake every time. Change it for variety.
 *  - Spin just the cake (not the board): cake.userData.cake.rotation.y += 0.01;
 *  - Not using ES modules? Delete the `export` keyword and call the function directly.
 */
export function createSakotis(THREE, options = {}) {
  const {
    height = 6.5,      // overall trunk height (scale the group afterwards if needed)
    tiers = 12,        // number of primary drip rings
    fillCount = 950,   // extra short drips for the dense, lacy overlap
    seed = 1,          // deterministic RNG seed
    board = true,      // include the thin gold cake board
    boardRadius = 2.62,
  } = options;

  const H = height;
  const rng = mulberry32(seed);
  const BOARD_H = 0.06;
  const group = new THREE.Group();

  // cone profile: base radius at normalized height t (0 base .. 1 pointed tip)
  const radiusAt = (t) => 0.05 + 0.82 * Math.pow(1 - t, 1.08);

  // inner group so the cake can spin independently of the board
  const cake = new THREE.Group();
  cake.position.y = BOARD_H; // cake-local y=0 sits on the board's top face
  group.add(cake);
  group.userData.cake = cake;

  // ---- inner trunk (mostly hidden), pale baked core ----
  const prof = [new THREE.Vector2(0.001, 0)];
  const segs = 80;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, y = t * H;
    const r = radiusAt(t) + 0.02 * Math.sin(t * Math.PI * 20);
    prof.push(new THREE.Vector2(Math.max(r, 0.02), y));
  }
  prof.push(new THREE.Vector2(0.01, H + 0.04));
  const trunk = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 48),
    new THREE.MeshStandardMaterial({ color: 0xd9b654, roughness: 0.75, metalness: 0.02 })
  );
  cake.add(trunk);

  // ---- drip blades: flat, ragged cones flaring out & hanging down, in tiers ----
  const bladeGeo = new THREE.ConeGeometry(1, 1, 5); // low-poly => irregular blade
  bladeGeo.translate(0, 0.5, 0);                    // base at attach point, apex is the drip tip

  const drips = [];

  // primary tiers → define the layered, conical silhouette
  for (let j = 0; j < tiers; j++) {
    const tf = j / (tiers - 1);
    const yA = 0.7 + tf * (H - 1.1);
    const th = yA / H;
    const trunkR = radiusAt(th);
    const reach = 2.4 * (1 - tf) + 0.30 + rng() * 0.15; // outer edge of this tier
    const count = Math.max(7, Math.round(20 * (1 - tf)) + 7);
    for (let s = 0; s < count; s++) {
      const theta = (s / count) * Math.PI * 2 + j * 0.4 + (rng() - 0.5) * 0.14;
      const d = (0.32 + 0.75 * tf) + rng() * 0.4; // droop grows toward the top
      drips.push({
        yA: yA + (rng() - 0.5) * 0.14, theta, trunkR, reach, d, tf,
        width: 0.30 + rng() * 0.34, thick: 0.07 + rng() * 0.05,
      });
    }
  }

  // fill drips → the dense, lacy overlap
  for (let i = 0; i < fillCount; i++) {
    const tf = Math.pow(rng(), 1.15); // slightly denser low down
    const yA = 0.7 + tf * (H - 1.2);
    const th = yA / H;
    const trunkR = radiusAt(th);
    const reach = trunkR + 0.18 + rng() * (1.85 * (1 - tf) + 0.25);
    const d = 0.5 + rng() * 1.2;
    drips.push({
      yA, theta: rng() * Math.PI * 2, trunkR, reach, d, tf,
      width: 0.16 + rng() * 0.30, thick: 0.05 + rng() * 0.05,
    });
  }

  const N = drips.length;
  const spikes = new THREE.InstancedMesh(
    bladeGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.58, metalness: 0.03 }),
    N
  );

  const xAxis = new THREE.Vector3(), yAxis = new THREE.Vector3(), zAxis = new THREE.Vector3();
  const rot = new THREE.Matrix4(), scl = new THREE.Matrix4(), trs = new THREE.Matrix4(), M = new THREE.Matrix4();
  const col = new THREE.Color();

  for (let i = 0; i < N; i++) {
    const it = drips[i];
    const cos = Math.cos(it.theta), sin = Math.sin(it.theta);
    const inv = 1 / Math.sqrt(1 + it.d * it.d);
    const dirY = it.d * inv; // magnitude of the downward component
    let length = Math.max(0.22, (it.reach - it.trunkR) / inv * (0.88 + rng() * 0.25));
    // keep tips from dropping below the board (cake-local y=0 is the board's top face)
    const maxLen = (it.yA - 0.02) / dirY;
    if (length > maxLen) length = Math.max(0.12, maxLen);

    yAxis.set(cos, -it.d, sin).normalize(); // length axis: out + down
    xAxis.set(-sin, 0, cos);                 // width axis: tangential (already ⟂ yAxis)
    zAxis.crossVectors(xAxis, yAxis);        // thin normal
    rot.makeBasis(xAxis, yAxis, zAxis);
    scl.makeScale(it.width, length, it.thick);
    trs.makeTranslation(it.trunkR * cos, it.yA, it.trunkR * sin);
    M.copy(trs).multiply(rot).multiply(scl);
    spikes.setMatrixAt(i, M);
    spikes.setColorAt(i, colorFor(col, it.tf, rng));
  }
  spikes.instanceMatrix.needsUpdate = true;
  if (spikes.instanceColor) spikes.instanceColor.needsUpdate = true;
  cake.add(spikes);

  // ---- thin gold cake board ----
  if (board) {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(boardRadius, boardRadius, BOARD_H, 64),
      new THREE.MeshStandardMaterial({ color: 0xcaa64c, roughness: 0.32, metalness: 0.7 })
    );
    b.position.y = BOARD_H / 2;
    group.add(b);
  }

  return group;
}

// pale butter-yellow base, scorched brown weighted toward the peaks
function colorFor(col, tf, rng) {
  const r = rng();
  const brownBias = 0.15 + tf * 0.22;
  let hex;
  if (r < brownBias)             hex = (rng() < 0.5) ? 0x5e380f : 0x86501a;
  else if (r < brownBias + 0.20) hex = 0xcf922c;
  else                           hex = (rng() < 0.5) ? 0xf1d652 : 0xe7bf3a;
  return col.setHex(hex).offsetHSL(0, 0, (rng() - 0.5) * 0.12);
}

// small seeded PRNG so a given seed always yields the same cake
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
