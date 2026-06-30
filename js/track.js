import * as THREE from 'three';
import { TRACK_POINTS, RACE } from './config.js';

// ============================================================
//  Track — a fixed closed circuit built from a Catmull-Rom curve.
//  Provides the visual road plus geometry helpers used for
//  ranking (progress along the curve) and off-track detection.
//  The path NEVER changes; only colors swap on theme/mode change.
// ============================================================
export class Track {
  constructor(scene) {
    this.scene = scene;
    this.width = RACE.roadWidth;

    const pts = TRACK_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    this.length = this.curve.getLength();

    // Pre-sample the curve for fast nearest-point queries.
    this.samples = 600;
    this._pts = this.curve.getSpacedPoints(this.samples);   // length samples+1
    this._tangents = [];
    for (let i = 0; i <= this.samples; i++) {
      this._tangents.push(this.curve.getTangentAt(i / this.samples));
    }

    this.group = new THREE.Group();
    scene.add(this.group);
    this._buildRoad();
    this._buildFinishLine();
  }

  // ---- build the flat road ribbon + bright white stripe edges + center dashes ----
  _buildRoad() {
    const half = this.width / 2;
    const curbW = 2.2;          // chunky white edge stripes
    const roadPos = [];
    const curbLPos = [];
    const curbRPos = [];

    for (let i = 0; i <= this.samples; i++) {
      const p = this._pts[i];
      const tan = this._tangents[i];
      // lateral = perpendicular to tangent in XZ plane
      const lat = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const lN = p.clone().addScaledVector(lat, -half);
      const rN = p.clone().addScaledVector(lat, half);
      roadPos.push(lN, rN);
      curbLPos.push(lN, lN.clone().addScaledVector(lat, -curbW));
      curbRPos.push(rN, rN.clone().addScaledVector(lat, curbW));
    }

    this.roadMesh = this._ribbon(roadPos, 0x1f9fff);
    // vibrant self-lit electric blue so the road glows
    this.roadMesh.material.emissive.setHex(0x1f9fff);
    this.roadMesh.material.emissiveIntensity = 0.28;
    this.roadMesh.position.y = 0.02;
    this.group.add(this.roadMesh);

    // pure-white, slightly glowing edge stripes
    this.curbL = this._ribbon(curbLPos, 0xffffff);
    this.curbR = this._ribbon(curbRPos, 0xffffff);
    for (const curb of [this.curbL, this.curbR]) {
      curb.material.emissive.setHex(0xffffff);
      curb.material.emissiveIntensity = 0.35;
      curb.position.y = 0.05;
      this.group.add(curb);
    }

    this._buildCenterLine();
  }

  // dashed white center line down the middle of the road
  _buildCenterLine() {
    const dashes = 90;
    const geo = new THREE.PlaneGeometry(0.7, 3.4);
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, side: THREE.DoubleSide,
    });
    for (let i = 0; i < dashes; i++) {
      if (i % 2) continue;                       // skip every other → dashed
      const t = i / dashes;
      const p = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t);
      const dash = new THREE.Mesh(geo, mat);
      dash.position.copy(p).setY(0.04);
      dash.rotation.set(-Math.PI / 2, 0, 0);
      dash.rotation.z = -Math.atan2(tan.x, tan.z);
      this.group.add(dash);
    }
  }

  // build a triangle-strip ribbon from paired vertices [l0,r0,l1,r1,...]
  _ribbon(verts, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(verts.length * 3);
    verts.forEach((v, i) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const idx = [];
    const pairs = verts.length / 2;
    for (let i = 0; i < pairs - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    return new THREE.Mesh(geo, mat);
  }

  _buildFinishLine() {
    const p = this._pts[0];
    const tan = this._tangents[0];
    const lat = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const geo = new THREE.PlaneGeometry(this.width, 3);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    const g = c.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
      g.fillStyle = (x + y) % 2 ? '#fff' : '#111';
      g.fillRect(x * 8, y * 8, 8, 8);
    }
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(p).setY(0.06);
    mesh.lookAt(p.clone().add(tan));
    mesh.rotateX(-Math.PI / 2);
    // simpler: orient flat and rotate around Y to match tangent
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    const angle = Math.atan2(tan.x, tan.z);
    mesh.rotation.z = -angle;
    this.group.add(mesh);

    // start/finish gantry posts
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xff2e88 })
      );
      post.position.copy(p.clone().addScaledVector(lat, s * (this.width / 2 + 0.5))).setY(4);
      this.group.add(post);
    }
  }

  applyPalette(pal) {
    this.roadMesh.material.color.setHex(pal.road);
    // keep the vibrant glow matched to the road color (dimmer in bad mode)
    this.roadMesh.material.emissive.setHex(pal.road);
    this.roadMesh.material.emissiveIntensity = 0.28;
  }

  // ---- geometry helpers ----
  pointAt(t) { return this.curve.getPointAt(t % 1); }
  tangentAt(t) { return this.curve.getTangentAt(t % 1); }
  lateralAt(t) {
    const tan = this.tangentAt(t);
    return new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  }

  // world position offset from centerline at param t by lateral fraction (-1..1)
  placeAt(t, sideFrac, y = 0) {
    const p = this.pointAt(t);
    const lat = this.lateralAt(t);
    return p.clone().addScaledVector(lat, sideFrac * (this.width / 2)).setY(y);
  }

  // nearest sample → returns { t (0..1), lateral (signed world units), dist }
  project(pos) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= this.samples; i++) {
      const dx = pos.x - this._pts[i].x;
      const dz = pos.z - this._pts[i].z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    const p = this._pts[best];
    const tan = this._tangents[best];
    const lat = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const off = new THREE.Vector3(pos.x - p.x, 0, pos.z - p.z);
    const lateral = off.dot(lat);
    return { t: best / this.samples, lateral, dist: Math.sqrt(bestD) };
  }

  startTransform(index) {
    // stagger the 4 racers across the line, just past it so a full lap counts
    const t = 0.01;
    const sideFrac = [-0.5, 0.16, -0.16, 0.5][index];
    const pos = this.placeAt(t, sideFrac, 0);
    const tan = this.tangentAt(t);
    const heading = Math.atan2(tan.x, tan.z);
    return { pos, heading };
  }
}
