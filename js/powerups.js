import * as THREE from 'three';
import { PICKUPS } from './config.js';

// ============================================================
//  Pickups — fixed power-up objects on the track + AI projectiles.
//  Only the player can collect pickups (per spec).
// ============================================================
export class Pickups {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = [];
    this.projectiles = [];
    this._build();
  }

  _build() {
    for (const def of PICKUPS) {
      const mesh = this._mesh(def);
      mesh.position.copy(this.track.placeAt(def.t, def.side, 1.6));
      this.group.add(mesh);
      // mode portals are large, so they get a correspondingly bigger hitbox
      const collectRadius = def.type === 'mode' ? 6.0 : 3.2;
      this.items.push({ def, mesh, active: true, respawn: 0, collectRadius });
    }
  }

  _mesh(def) {
    const g = new THREE.Group();
    const m = (c, opts = {}) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, ...opts });
    switch (def.type) {
      case 'boost': {
        // glowing coffee cup
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.2, 12), m(0x6f4e37));
        g.add(cup);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 12), m(0xffffff));
        lid.position.y = 0.7; g.add(lid);
        g.userData.icon = '☕'; g.userData.spin = 2;
        break;
      }
      case 'theme': {
        // white shining oval portal with iconic object inside
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.35, 12, 28), m(0xffffff, { emissiveIntensity: 0.8 }));
        ring.scale.set(1, 1.4, 1);
        g.add(ring);
        const inner = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
        inner.scale.set(1, 1.4, 1);
        g.add(inner);
        const sym = themeSymbol(def.theme);
        sym.position.z = 0.1;
        g.add(sym);
        g.userData.icon = '🌀'; g.userData.spin = 0.6; g.userData.billboard = true;
        break;
      }
      case 'mode': {
        if (def.mode === 'bad') {
          // organic HORROR PORTAL — a fleshy rift torn open in space
          // 1. Core rift: vertical pointed-oval (almond/eye) via bezier curves
          const rift = new THREE.Shape();
          rift.moveTo(0, 2.6);
          rift.bezierCurveTo(1.6, 1.4, 1.6, -1.4, 0, -2.6);
          rift.bezierCurveTo(-1.6, -1.4, -1.6, 1.4, 0, 2.6);
          const riftGeo = new THREE.ExtrudeGeometry(rift, { depth: 0.3, bevelEnabled: false });
          const riftMesh = new THREE.Mesh(riftGeo, m(0x1a0000, { emissiveIntensity: 0.7 }));
          riftMesh.position.z = -0.15;
          g.add(riftMesh);

          // 2. Membrane filling the rift + vertical "vein" details
          const membrane = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 5),
            new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
          );
          membrane.position.z = 0.05;
          g.add(membrane);
          for (let i = 0; i < 6; i++) {
            const t = (i / 5 - 0.5);          // -0.5 .. 0.5
            const h = 4.4 * (1 - Math.abs(t) * 1.3); // taller in the middle of the eye
            if (h <= 0.2) continue;
            const vein = new THREE.Mesh(
              new THREE.BoxGeometry(0.05, h, 0.05),
              m(0x4d0000, { emissiveIntensity: 0.5 })
            );
            vein.position.set(t * 2.0, 0, 0.1);
            g.add(vein);
          }

          // 3. Tendrils: 8 thick curved tentacle arms radiating from the rift edge
          const tendrilColors = [0x1a0a00, 0x120800, 0x0a0400, 0x000000];
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const sx = Math.cos(a) * 1.2, sy = Math.sin(a) * 2.4; // start on the almond edge
            const dirx = Math.cos(a), diry = Math.sin(a);
            const curl = (i % 2 === 0 ? 1 : -1) * (0.8 + (i % 3) * 0.5);
            const pts = [
              new THREE.Vector3(sx, sy, 0),
              new THREE.Vector3(sx + dirx * 1.6 - diry * curl * 0.4, sy + diry * 1.6 + dirx * curl * 0.4, 0.3),
              new THREE.Vector3(sx + dirx * 3.0 + diry * curl, sy + diry * 3.0 - dirx * curl, -0.2),
              new THREE.Vector3(sx + dirx * 4.2 - diry * curl * 1.4, sy + diry * 4.2 + dirx * curl * 1.4, 0.4),
              new THREE.Vector3(sx + dirx * 5.0 + diry * curl * 2.0, sy + diry * 5.0 - dirx * curl * 2.0, -0.3),
            ];
            const curve = new THREE.CatmullRomCurve3(pts);
            const radius = 0.15 + (i % 4) * (0.20 / 3); // 0.15 .. 0.35
            const tube = new THREE.Mesh(
              new THREE.TubeGeometry(curve, 24, radius, 8, false),
              m(tendrilColors[i % tendrilColors.length], { emissiveIntensity: 0.25 })
            );
            g.add(tube);
          }

          // 4. Glow layers — coloured lights + emissive rings
          const pink = new THREE.PointLight(0xff00cc, 2.5, 30);
          pink.position.set(0, 0, 0.5);
          g.add(pink);
          const orange = new THREE.PointLight(0xff6600, 1.8, 30);
          orange.position.set(0.6, -0.6, 0.5);
          g.add(orange);
          const outerRing = new THREE.Mesh(
            new THREE.TorusGeometry(3.4, 0.25, 16, 40),
            m(0xff1493, { emissiveIntensity: 1.2 })
          );
          outerRing.scale.set(0.85, 1.3, 1);
          g.add(outerRing);
          const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.4, 0.2, 16, 36),
            m(0xff6600, { emissiveIntensity: 1.5 })
          );
          innerRing.scale.set(0.75, 1.2, 1);
          g.add(innerRing);

          // 5. behaviour
          g.userData.icon = '🌧'; g.userData.spin = 0.3; g.userData.billboard = true;
          break;
        }
        // green (good) PORTAL — big colored hollow ring you can see through
        const c = 0x33ff88;
        const R = 3.4; // ~2x the old portal — bigger & more visible
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.4, 16, 36), m(c, { emissiveIntensity: 0.95 }));
        g.add(ring);
        // faint transparent membrane so the interior is hollow / see-through
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(R - 0.35, 36),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
        );
        g.add(inner);
        g.userData.icon = '🌞'; g.userData.spin = 1.0; g.userData.billboard = true;
        break;
      }
      case 'slowmo': {
        // big mushroom / cannabis side object
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2, 12), m(0xf3e5d0, { emissiveIntensity: 0.2 }));
        g.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), m(0xcc3344, { emissiveIntensity: 0.5 }));
        cap.position.y = 1; cap.scale.y = 0.8; g.add(cap);
        for (let i = 0; i < 5; i++) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), m(0xffffff, { emissiveIntensity: 0.6 }));
          const a = i / 5 * Math.PI * 2;
          dot.position.set(Math.cos(a) * 1.0, 1.4, Math.sin(a) * 1.0); g.add(dot);
        }
        g.scale.setScalar(1.4);
        g.userData.icon = '🍄'; g.userData.spin = 0.8;
        break;
      }
    }
    return g;
  }

  // spin/bob animation + respawn handling
  update(dt, camera) {
    const tnow = performance.now() * 0.001;
    for (const it of this.items) {
      it.mesh.rotation.y += (it.mesh.userData.spin || 1) * dt;
      it.mesh.position.y = (it.def.type === 'slowmo' ? 1.0 : 1.6) + Math.sin(tnow * 2 + it.def.t * 10) * 0.2;
      if (it.mesh.userData.billboard && camera) {
        it.mesh.rotation.y = Math.atan2(camera.position.x - it.mesh.position.x, camera.position.z - it.mesh.position.z);
      }
      if (!it.active) {
        it.respawn -= dt;
        if (it.respawn <= 0) { it.active = true; it.mesh.visible = true; }
      }
    }
    // projectiles
    for (const p of this.projectiles) {
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 8;
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (p.life <= 0) { this.scene.remove(p.mesh); return false; }
      return true;
    });
  }

  // returns array of collected defs this frame
  checkCollect(playerKart) {
    const hits = [];
    for (const it of this.items) {
      if (!it.active) continue;
      if (playerKart.pos.distanceTo(it.mesh.position) < it.collectRadius) {
        it.active = false;
        it.mesh.visible = false;
        it.respawn = 10; // reappear later for replay value
        hits.push(it.def);
      }
    }
    return hits;
  }

  fireProjectile(fromKart, targetKart) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6),
      new THREE.MeshLambertMaterial({ color: 0x9b59ff, emissive: 0x6a3aff, emissiveIntensity: 0.6 })
    );
    mesh.position.copy(fromKart.pos).setY(1.4);
    const vel = new THREE.Vector3().subVectors(targetKart.pos, fromKart.pos).setY(0).normalize().multiplyScalar(48);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, vel, life: 2.5, from: fromKart });
  }

  // check projectile hits vs player; returns true if hit landed
  checkProjectileHits(playerKart) {
    if (playerKart.invuln) return false;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.mesh.position.distanceTo(playerKart.pos) < 2.4) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        return playerKart.applyHit();
      }
    }
    return false;
  }

  clearProjectiles() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
  }

  resetAll() {
    this.clearProjectiles();
    for (const it of this.items) { it.active = true; it.mesh.visible = true; it.respawn = 0; }
  }
}

// small iconic object shown inside a theme portal
function themeSymbol(theme) {
  const m = (c) => new THREE.MeshBasicMaterial({ color: c });
  const g = new THREE.Group();
  switch (theme) {
    case 'berlin': {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 2, 8), m(0xc0c8ff)); g.add(s);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), m(0xff4b2b)); b.position.y = 0.8; g.add(b);
      break;
    }
    case 'amsterdam': {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.18, 16), m(0xe8b04b)); p.rotation.x = 0.5; g.add(p);
      break;
    }
    case 'vilnius': {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 8), m(0xb5503a)); g.add(t);
      break;
    }
    case 'vinted': {
      const v = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.18, 8, 20), m(0x09b1ba)); g.add(v);
      break;
    }
  }
  return g;
}
