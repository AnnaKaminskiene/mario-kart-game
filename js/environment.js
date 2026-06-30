import * as THREE from 'three';
import { THEMES } from './config.js';

// ============================================================
//  Environment — themed scenery scattered around the fixed track.
//  Swapped wholesale when the player hits a theme/mode portal.
//  Object budget per theme (cartoon primitives, recognizable):
//    big landmarks, medium features, small details.
// ============================================================
export class Environment {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.flowers = [];
  }

  // pos just outside the road at param t, distance d beyond the curb
  _outside(t, side, dist, y = 0) {
    const base = this.track.placeAt(t, side, 0);
    const lat = this.track.lateralAt(t);
    return base.addScaledVector(lat, side * dist).setY(y);
  }

  build(themeKey, mode) {
    this.clear();
    const theme = THEMES[themeKey];
    const pal = theme[mode];
    // bright toy material — slight self-glow keeps colors saturated & non-grey
    const m = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 });

    // ---- big landmarks — far out so they loom as a skyline (depth layer 1) ----
    for (let i = 0; i < 12; i++) {
      const t = i / 12 + 0.02;
      const side = i % 2 ? 1 : -1;
      const lm = this._landmark(themeKey, mode, m, i);
      lm.position.copy(this._outside(t, side, 48 + (i % 3) * 26, 0));
      this.group.add(lm);
    }

    // ---- medium features — mid-field (depth layer 2), both sides, dense ----
    const medCount = 60;
    for (let i = 0; i < medCount; i++) {
      const t = (i / medCount + 0.006) % 1;
      const side = i % 2 ? 1 : -1;
      const med = this._medium(themeKey, mode, m, i);
      med.position.copy(this._outside(t, side, 17 + (i % 8) * 4.2, 0));
      med.rotation.y = i * 1.3;
      this.group.add(med);
    }

    // ---- small details — near band (depth layer 3), VERY dense + varied ----
    // two interleaved sub-rings so both road sides stay crowded the whole loop.
    const smallCount = 260;
    for (let i = 0; i < smallCount; i++) {
      const t = (i / smallCount + (i % 2) * 0.0019) % 1;
      const side = (i % 2 ? 1 : -1);
      const small = this._small(themeKey, mode, m, i);
      // staggered: most hug the track, some pushed out to bridge toward mid-field
      const dist = 6 + (i % 11) * 2.3 + (i % 4) * 2.0;
      small.position.copy(this._outside(t, side, dist, 0));
      small.rotation.y = Math.sin(i * 2.1) * Math.PI;
      this.group.add(small);
    }

    // ground & sky handled by Game via palette
    return pal;
  }

  _landmark(themeKey, mode, m, i) {
    const g = new THREE.Group();
    const bad = mode === 'bad';
    const accent = THEMES[themeKey][mode].accent;
    switch (themeKey) {
      case 'berlin': {
        if (i % 3 === 0) { // Fernsehturm — MASSIVE red & white tower, the dominant skyline piece
          const white = bad ? 0xbcc2cc : 0xffffff;
          const red = bad ? 0x7a3a3a : 0xff2e3a;
          // tapering shaft ~95 tall
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 5.2, 95, 20), m(white));
          shaft.position.y = 47; g.add(shaft);
          // red banding up the shaft
          for (const yy of [22, 44, 66]) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 4.5, 20), m(red));
            band.position.y = yy; g.add(band);
          }
          // observation sphere wrapped in a white deck ring
          const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 22, 22), m(red));
          ball.position.y = 100; g.add(ball);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 1.6, 12, 28), m(white));
          ring.rotation.x = Math.PI / 2; ring.position.y = 100; g.add(ring);
          // tall antenna: white mast, red tip
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 30, 12), m(white));
          mast.position.y = 124; g.add(mast);
          for (const yy of [118, 130]) {
            const aband = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.2, 12), m(red));
            aband.position.y = yy; g.add(aband);
          }
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 10, 10), m(red));
          tip.position.y = 144; g.add(tip);
        } else { // Brandenburg Gate — big yellow/beige colonnade with arched openings + quadriga
          const gold = bad ? 0x8a7a3a : 0xf5b922;
          const beige = bad ? 0xb8b4a6 : 0xe6cf92;
          const W = 44, colN = 6, span = 7.0;
          // wide base plinth
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(W, 2.6, 11), m(beige));
          plinth.position.y = 1.3; g.add(plinth);
          // thick columns
          for (let c = 0; c < colN; c++) {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 27, 16), m(beige));
            col.position.set((c - (colN - 1) / 2) * span, 16, 0); g.add(col);
          }
          // arched openings between columns (half-torus arcs)
          for (let a = 0; a < colN - 1; a++) {
            const arch = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.9, 10, 18, Math.PI), m(gold));
            arch.position.set(((a + 0.5) - (colN - 1) / 2) * span, 26, 0);
            g.add(arch);
          }
          // thick entablature beam across the top
          const top = new THREE.Mesh(new THREE.BoxGeometry(W, 5.5, 11), m(beige));
          top.position.y = 32.5; g.add(top);
          const frieze = new THREE.Mesh(new THREE.BoxGeometry(W, 1.6, 11.4), m(gold));
          frieze.position.y = 29; g.add(frieze);
          // quadriga crown: chariot box + four horses
          const chariot = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), m(gold));
          chariot.position.set(0, 37, 0); g.add(chariot);
          for (let h = 0; h < 4; h++) {
            const horse = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3, 3.4), m(gold));
            horse.position.set(-5 + h * 2.4, 37.5, 1.5); g.add(horse);
          }
        }
        break;
      }
      case 'amsterdam': { // windmill or canal house row
        if (i % 2 === 0) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 18, 12), m(bad ? 0x6b5a4a : 0xb5895f));
          tower.position.y = 9; g.add(tower);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(4.5, 6, 12), m(0x553c2a));
          cap.position.y = 21; g.add(cap);
          const hub = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), m(0x333));
          hub.position.set(0, 21, 4); g.add(hub);
          for (let b = 0; b < 4; b++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 0.4), m(bad ? 0x888 : 0xf0ead6));
            blade.position.set(0, 21, 4); blade.rotation.z = b * Math.PI / 2;
            g.add(blade);
          }
        } else {
          for (let h = 0; h < 4; h++) {
            const house = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 5), m(bad ? 0x4a4036 : [0xc0392b, 0x2c3e50, 0x27ae60, 0xe67e22][h % 4]));
            house.position.set((h - 1.5) * 4.4, 6, 0); g.add(house);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 4), m(0x5a3a2a));
            roof.position.set((h - 1.5) * 4.4, 13, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
          }
        }
        break;
      }
      case 'vilnius': { // Gediminas Tower on a hill / church
        if (i % 2 === 0) {
          const hill = new THREE.Mesh(new THREE.ConeGeometry(10, 10, 16), m(bad ? 0x4a5238 : 0x6f9a4a));
          hill.position.y = 5; g.add(hill);
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 12, 8), m(bad ? 0x8a4a3a : 0xb5503a));
          tower.position.y = 14; g.add(tower);
          const top = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 7), m(bad ? 0x7a4030 : 0xa04a36));
          top.position.y = 21; g.add(top);
        } else {
          const base = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 8), m(bad ? 0xb0a89a : 0xfff8ee));
          base.position.y = 7; g.add(base);
          const dome = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 10), m(accent));
          dome.position.y = 16; g.add(dome);
        }
        break;
      }
      case 'vinted': { // mountains of clothing / giant hanger
        const mtn = new THREE.Mesh(new THREE.ConeGeometry(12, 26, 6), m(bad ? 0x4a5450 : [0x09b1ba, 0xff7aa2, 0xffd23f][i % 3]));
        mtn.position.y = 13; g.add(mtn);
        const tee = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 1), m(bad ? 0x667 : 0xffffff));
        tee.position.y = 24; g.add(tee);
        break;
      }
    }
    return g;
  }

  _medium(themeKey, mode, m, i) {
    const g = new THREE.Group();
    const bad = mode === 'bad';
    const accent = THEMES[themeKey][mode].accent;
    // 6-way variety of mid-field street furniture & greenery
    const kind = i % 6;
    if (kind === 0) { // market stall with striped awning
      const roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 4), m(bad ? 0x555550 : accent));
      roof.position.y = 4.4; g.add(roof);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.6, 3.4), m(bad ? 0x4a4a44 : 0xfff2e0));
      counter.position.y = 1.4; g.add(counter);
      for (const [x, z] of [[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.8], [2.6, 1.8]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.4), m(bad ? 0x444 : 0xe8e8e8));
        leg.position.set(x, 2.2, z); g.add(leg);
      }
    } else if (kind === 1) { // leafy tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 5), m(0x6b4423));
      trunk.position.y = 2.5; g.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 1), m(bad ? 0x3a4a30 : 0x49c24a));
      crown.position.y = 6.2; g.add(crown);
      const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), m(bad ? 0x33402b : 0x5fd35f));
      crown2.position.set(1.2, 5.2, 0.6); g.add(crown2);
    } else if (kind === 2) { // tall lamppost
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 8), m(bad ? 0x3a3a40 : 0x35506b));
      pole.position.y = 4; g.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.2), m(bad ? 0x3a3a40 : 0x35506b));
      arm.position.set(0.9, 7.8, 0); g.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), m(0xfff2a8));
      lamp.position.set(1.9, 7.6, 0); g.add(lamp);
    } else if (kind === 3) { // U-Bahn / street sign on a post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6), m(0xbfc6cc));
      post.position.y = 3; g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 0.3), m(bad ? 0x556 : [0x1f6fff, 0xff2e63, 0x2ecc40][i % 3]));
      board.position.y = 6.2; g.add(board);
    } else if (kind === 4) { // Späti kiosk with awning
      const box = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), m(bad ? 0x4a4a44 : 0xff7a18));
      box.position.y = 2; g.add(box);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 1.6), m(bad ? 0x555 : 0xffffff));
      awn.position.set(0, 3.6, 2.4); g.add(awn);
    } else { // bright food van
      const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 2.6), m(bad ? 0x6a6a64 : [0xffd23f, 0x09b1ba, 0xff5ca8][i % 3]));
      body.position.y = 1.8; g.add(body);
      for (const x of [-1.6, 1.6]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), m(0x1a1a22));
        wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.6, 1.4); g.add(wheel);
      }
    }
    return g;
  }

  _small(themeKey, mode, m, i) {
    const bad = mode === 'bad';
    if (bad) return this._smallLitter(m, i);
    if (themeKey === 'berlin') return berlinTrinket(m, i);
    return this._smallGeneric(m, i);
  }

  _smallLitter(m, i) {
    const g = new THREE.Group();
    const kind = i % 3;
    if (kind === 0) {
      const trash = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8), m(0x4a4a44));
      trash.position.y = 0.6; g.add(trash);
    } else if (kind === 1) {
      const heap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), m(0x55504a));
      heap.position.y = 0.5; g.add(heap);
    } else {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), m(0x6a6a60));
      tag.position.y = 0.9; g.add(tag);
    }
    g.scale.setScalar(1.4);
    return g;
  }

  _smallGeneric(m, i) {
    const g = new THREE.Group();
    const kind = i % 3;
    if (kind === 0) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9), m(0x2e7d32));
      stem.position.y = 0.45; g.add(stem);
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), m([0xff5ca8, 0xffd23f, 0xff7043, 0x9c27b0][i % 4]));
      petal.position.y = 0.95; g.add(petal);
      this.flowers.push(g);
    } else if (kind === 1) {
      const food = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), m([0xffb300, 0xef5350, 0x8bc34a][i % 3]));
      food.position.y = 0.45; g.add(food);
    } else {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6), m(0x4caf50));
      bush.position.y = 0.5; g.add(bush);
    }
    g.scale.setScalar(1.4);
    return g;
  }

  clear() {
    this.flowers = [];
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      this.group.remove(c);
    }
  }
}

// ============================================================
//  Berlin street trinkets — the dense near-track clutter.
//  12 recognizable little objects cycled by index for variety.
// ============================================================
function berlinTrinket(m, i) {
  const g = new THREE.Group();
  const mesh = (geo, c) => new THREE.Mesh(geo, m(c));
  const add = (geo, c, x = 0, y = 0, z = 0) => { const o = mesh(geo, c); o.position.set(x, y, z); g.add(o); return o; };

  switch (i % 12) {
    case 0: { // pretzel — tan, standing up
      const p = add(new THREE.TorusGeometry(0.55, 0.2, 8, 18), 0xc98a3c, 0, 0.7, 0);
      p.rotation.x = 0.25;
      // salt flecks
      add(new THREE.SphereGeometry(0.06, 6, 6), 0xffffff, 0.2, 1.05, 0.1);
      add(new THREE.SphereGeometry(0.06, 6, 6), 0xffffff, -0.25, 0.95, 0.1);
      break;
    }
    case 1: { // beer bottle — green glass + cap + label
      add(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 12), 0x2f9e3a, 0, 0.65, 0);
      add(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 10), 0x2f9e3a, 0, 1.45, 0);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10), 0xffd23f, 0, 1.72, 0);
      add(new THREE.CylinderGeometry(0.33, 0.33, 0.4, 12), 0xfff2e0, 0, 0.6, 0);
      break;
    }
    case 2: { // currywurst on a fork — red chunks + silver prongs
      add(new THREE.BoxGeometry(0.7, 0.5, 0.5), 0xfff2e0, 0, 0.25, 0); // paper tray
      for (let k = 0; k < 3; k++) add(new THREE.CapsuleGeometry(0.12, 0.18, 4, 8), 0xff3b1e, -0.2 + k * 0.2, 0.55, 0);
      // little silver fork sticking up
      add(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), 0xcfd6dd, 0.28, 0.9, 0.1);
      break;
    }
    case 3: { // vinyl record — black disc, colored label
      const d = add(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24), 0x141418, 0, 0.5, 0);
      d.rotation.x = Math.PI / 2 - 0.5;
      const lab = add(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), [0xff2e63, 0xffd23f, 0x1f9fff][i % 3], 0, 0.5, 0);
      lab.rotation.x = Math.PI / 2 - 0.5;
      break;
    }
    case 4: { // neon cocktail glass — martini + pink liquid + cherry
      const bowl = add(new THREE.ConeGeometry(0.5, 0.6, 14, 1, true), 0x9be7ff, 0, 0.95, 0);
      const liquid = add(new THREE.ConeGeometry(0.4, 0.42, 14), 0xff4fa3, 0, 0.92, 0);
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), 0xbfeaff, 0, 0.45, 0);
      add(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 12), 0xbfeaff, 0, 0.1, 0);
      add(new THREE.SphereGeometry(0.1, 8, 8), 0xff2e3a, 0.12, 1.15, 0);
      break;
    }
    case 5: { // sunflower — tall stem, yellow petals, brown center
      add(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), 0x2e9e3a, 0, 1.1, 0);
      add(new THREE.IcosahedronGeometry(0.22, 0), 0x3fa34d, 0.18, 1.3, 0); // leaf
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        add(new THREE.SphereGeometry(0.18, 6, 6), 0xffd23f, Math.cos(a) * 0.35, 2.25, Math.sin(a) * 0.35);
      }
      add(new THREE.SphereGeometry(0.26, 10, 10), 0x6b3f1d, 0, 2.25, 0);
      break;
    }
    case 6: { // coffee cup — colored cup + white lid
      const c = [0xff5ca8, 0x1f9fff, 0xff7a18, 0x2ecc40][i % 4];
      add(new THREE.CylinderGeometry(0.32, 0.24, 0.9, 14), c, 0, 0.45, 0);
      add(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 14), 0xffffff, 0, 0.96, 0);
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), 0xffffff, 0, 1.1, 0);
      break;
    }
    case 7: { // flower box — planter with 3 bright blooms
      add(new THREE.BoxGeometry(1.4, 0.5, 0.6), 0x8a5a33, 0, 0.25, 0);
      const cols = [0xff2e63, 0xffd23f, 0x9b4dff];
      for (let k = 0; k < 3; k++) {
        add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), 0x2e9e3a, -0.45 + k * 0.45, 0.65, 0);
        add(new THREE.SphereGeometry(0.18, 8, 8), cols[k], -0.45 + k * 0.45, 0.95, 0);
      }
      break;
    }
    case 8: { // street sign — post + arrow board
      add(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), 0xbfc6cc, 0, 1.1, 0);
      add(new THREE.BoxGeometry(1.1, 0.5, 0.1), [0x1f6fff, 0xff2e63][i % 2], 0.3, 1.9, 0);
      break;
    }
    case 9: { // bollard light — short post + glowing top
      add(new THREE.CylinderGeometry(0.16, 0.2, 1.2, 10), 0x35506b, 0, 0.6, 0);
      add(new THREE.SphereGeometry(0.22, 10, 10), 0xfff2a8, 0, 1.35, 0);
      break;
    }
    case 10: { // leafy bush
      add(new THREE.IcosahedronGeometry(0.6, 1), 0x49c24a, 0, 0.5, 0);
      add(new THREE.IcosahedronGeometry(0.42, 1), 0x5fd35f, 0.4, 0.4, 0.2);
      break;
    }
    default: { // flower cluster
      const cols = [0xff5ca8, 0xffd23f, 0xff7043, 0x9b4dff];
      for (let k = 0; k < 3; k++) {
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), 0x2e9e3a, -0.2 + k * 0.2, 0.4, k * 0.1);
        add(new THREE.SphereGeometry(0.22, 8, 8), cols[(i + k) % 4], -0.2 + k * 0.2, 0.85, k * 0.1);
      }
    }
  }
  g.scale.setScalar(1.5);
  return g;
}
