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
        // green (good) or red (bad) PORTAL — big colored hollow ring you can see through
        const c = def.mode === 'good' ? 0x33ff88 : 0xff2233;
        const R = 3.4; // ~2x the old portal — bigger & more visible
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.4, 16, 36), m(c, { emissiveIntensity: 0.95 }));
        g.add(ring);
        // faint transparent membrane so the interior is hollow / see-through
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(R - 0.35, 36),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
        );
        g.add(inner);
        g.userData.icon = def.mode === 'good' ? '🌞' : '🌧'; g.userData.spin = 1.0; g.userData.billboard = true;
        break;
      }
      case 'slowmo': {
        // cannabis leaf: 7 elongated pointed leaflets fanned around a central stem
        const leafMat = m(0x33cc44, { emissiveIntensity: 0.85 });
        // build a single pointed-ellipse leaflet shape, extruded for a bit of depth
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.18, 0.5, 0.12, 1.1, 0, 1.5);   // up one side to the tip
        leafShape.bezierCurveTo(-0.12, 1.1, -0.18, 0.5, 0, 0);   // back down the other side
        const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.06, bevelEnabled: false });
        // base of the leaflet sits at the origin so it fans out from the stem
        leafGeo.center();
        leafGeo.translate(0, 0.75, 0);
        // 7 leaflets fanned out, centre tallest, shrinking toward the edges
        const angles = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
        for (let i = 0; i < angles.length; i++) {
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          const len = 1 - Math.abs(angles[i]) * 0.45; // outer leaflets a bit shorter
          leaf.scale.set(len, len, 1);
          leaf.rotation.z = angles[i];
          g.add(leaf);
        }
        // thin central stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), m(0x2e8b2e, { emissiveIntensity: 0.5 }));
        stem.position.y = -0.6; g.add(stem);
        g.scale.setScalar(2.4);

        // ring of rainbow sparkles around the leaf
        const rainbow = [0xff0000, 0xff8800, 0xffee00, 0x33cc44, 0x00ccff, 0x3344ff, 0xaa33ff, 0xff33cc];
        const sparkles = [];
        for (let i = 0; i < 8; i++) {
          const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), m(rainbow[i], { emissiveIntensity: 0.9 }));
          const a = i / 8 * Math.PI * 2;
          sp.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
          g.add(sp);
          sparkles.push(sp);
        }
        g.userData.sparkles = sparkles;
        g.userData.icon = '🍁'; g.userData.spin = 0.8;
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
      if (it.active && it.def.type === 'slowmo' && it.mesh.userData.sparkles) {
        const sparkles = it.mesh.userData.sparkles;
        for (let i = 0; i < sparkles.length; i++) {
          const sp = sparkles[i];
          // orbit around the Y axis, each sparkle offset by its index so they fan out
          const a = tnow * 1.5 + (i / sparkles.length) * Math.PI * 2;
          const r = 2.2;
          sp.position.set(Math.cos(a) * r, Math.sin(tnow * 2 + i) * 0.4, Math.sin(a) * r);
          // pulse scale with a sine wave so they twinkle
          const s = 0.7 + Math.abs(Math.sin(tnow * 4 + i * 0.8)) * 0.8;
          sp.scale.setScalar(s);
        }
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
