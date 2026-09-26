// Animerad 3D-logga: skimrande maskeradmask med glödring och gnistor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function maskShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.2);
  s.bezierCurveTo(0.18, 0.36, 0.55, 0.46, 0.9, 0.34);
  s.bezierCurveTo(1.04, 0.2, 1.0, -0.12, 0.8, -0.24);
  s.bezierCurveTo(0.58, -0.38, 0.28, -0.32, 0.13, -0.16);
  s.bezierCurveTo(0.07, -0.1, -0.07, -0.1, -0.13, -0.16);
  s.bezierCurveTo(-0.28, -0.32, -0.58, -0.38, -0.8, -0.24);
  s.bezierCurveTo(-1.0, -0.12, -1.04, 0.2, -0.9, 0.34);
  s.bezierCurveTo(-0.55, 0.46, -0.18, 0.36, 0, 0.2);
  for (const x of [0.46, -0.46]) {
    const h = new THREE.Path();
    h.absellipse(x, 0.02, 0.2, 0.12, 0, Math.PI * 2, false, x > 0 ? -0.2 : 0.2);
    s.holes.push(h);
  }
  return s;
}

export class Logo3D {
  constructor(canvas, { particles = true, interactive = true, fps = 60 } = {}) {
    this.canvas = canvas;
    this.interactive = interactive;
    this.frameMs = 1000 / fps;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    this.renderer = r;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0, 0, 4.5);

    const geo = new THREE.ExtrudeGeometry(maskShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6, curveSegments: 48 });
    geo.center();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - 0.35 * p.getX(i) * p.getX(i));
    geo.computeVertexNormals();
    this.mat = new THREE.MeshPhysicalMaterial({
      color: 0x9677ff,
      metalness: 0.7,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 1,
      iridescenceIOR: 1.9,
      iridescenceThicknessRange: [120, 820],
      envMapIntensity: 1.1,
    });
    this.mask = new THREE.Mesh(geo, this.mat);
    this.group = new THREE.Group();
    this.group.add(this.mask);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.018, 16, 160),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, toneMapped: false }),
    );
    ring.rotation.x = Math.PI / 2.3;
    this.ring = ring;
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.01, 12, 160),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.6, toneMapped: false }),
    );
    ring2.rotation.set(Math.PI / 1.8, 0.4, 0);
    this.ring2 = ring2;
    this.group.add(ring, ring2);

    if (particles) {
      const n = 90;
      const pos = new Float32Array(n * 3);
      this.seeds = [];
      for (let i = 0; i < n; i++) this.seeds.push({ r: 1.3 + Math.random() * 0.9, a: Math.random() * 6.28, y: (Math.random() - 0.5) * 1.6, s: 0.2 + Math.random() * 0.6 });
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const tex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.3, 'rgba(200,190,255,0.6)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8ccff }));
      this.scene.add(this.points);
    }
    const key = new THREE.PointLight(0x22d3ee, 9, 12);
    key.position.set(2.5, 2, 3);
    const rim = new THREE.PointLight(0xff4fd8, 8, 12);
    rim.position.set(-2.5, -1.5, 2);
    this.scene.add(this.group, key, rim, new THREE.AmbientLight(0xffffff, 0.3));

    this.target = { x: 0, y: 0 };
    this.onMove = (e) => {
      this.target.x = (e.clientX / innerWidth - 0.5) * 2;
      this.target.y = (e.clientY / innerHeight - 0.5) * 2;
    };
    if (interactive) addEventListener('pointermove', this.onMove);
    this._last = 0;
    this.running = false;
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 100;
    const h = this.canvas.clientHeight || 100;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      if (now - this._last < this.frameMs - 1) return;
      this._last = now;
      const t = now / 1000;
      const g = this.group;
      g.rotation.y += (this.target.x * 0.6 + Math.sin(t * 0.6) * 0.35 - g.rotation.y) * 0.06;
      g.rotation.x += (this.target.y * 0.35 + Math.sin(t * 0.8) * 0.08 - g.rotation.x) * 0.06;
      g.position.y = Math.sin(t * 1.2) * 0.06;
      this.ring.rotation.z = t * 0.5;
      this.ring2.rotation.z = -t * 0.35;
      this.mat.iridescenceIOR = 1.6 + Math.sin(t * 0.7) * 0.35;
      if (this.points) {
        const a = this.points.geometry.attributes.position;
        this.seeds.forEach((s, i) => {
          const ang = s.a + t * s.s * 0.5;
          a.setXYZ(i, Math.cos(ang) * s.r, s.y + Math.sin(t * s.s + i) * 0.1, Math.sin(ang) * s.r * 0.6);
        });
        a.needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  dispose() {
    this.stop();
    removeEventListener('pointermove', this.onMove);
    this.renderer.dispose();
  }
}
