// Egen 3D-modell: VRM (VRoid m.fl.) eller GLB med ARKit-blendshapes (t.ex. Ready Player Me).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarBase } from './base.js';

const norm = (name) =>
  name
    .toLowerCase()
    .replace(/[_\-. ]l$/, 'left')
    .replace(/[_\-. ]r$/, 'right')
    .replace(/[^a-z0-9]/g, '');

export async function loadModel(url) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader.loadAsync(url);
}

export class CustomAvatar extends AvatarBase {
  static meta = { id: 'custom', name: 'Egen modell', icon: '📦', desc: 'Ladda en egen VRM-modell (VRoid Studio) eller GLB med ARKit-blendshapes (Ready Player Me).' };
  static defaults = {};

  constructor(gltf, name = 'Egen modell') {
    super();
    this.name = name;
    this.gltf = gltf;
    this.vrm = gltf.userData.vrm ?? null;
    this.setup();
  }

  build() {}

  setup() {
    const vrm = this.vrm;
    const model = vrm ? vrm.scene : this.gltf.scene;
    if (vrm) {
      VRMUtils.removeUnnecessaryVertices(model);
      VRMUtils.combineSkeletons?.(model);
      VRMUtils.rotateVRM0(vrm);
      model.traverse((o) => (o.frustumCulled = false));
    }
    this.model = model;
    this.root.add(model);
    model.updateMatrixWorld(true);

    // Hitta huvud- och halsben
    if (vrm) {
      const h = vrm.humanoid;
      this.headBone = h.getNormalizedBoneNode('head');
      this.neckBone = h.getNormalizedBoneNode('neck');
      this.spineBone = h.getNormalizedBoneNode('upperChest') ?? h.getNormalizedBoneNode('chest') ?? h.getNormalizedBoneNode('spine');
      const la = h.getNormalizedBoneNode('leftUpperArm');
      const ra = h.getNormalizedBoneNode('rightUpperArm');
      if (la) la.rotation.z = -1.2;
      if (ra) ra.rotation.z = 1.2;
      vrm.update(0);
    } else {
      const bones = [];
      model.traverse((o) => o.isBone && bones.push(o));
      const find = (re, not) => bones.find((b) => re.test(b.name) && !(not && not.test(b.name)));
      this.headBone = find(/head$|head[^a-z]?$|^head/i, /end|top/i) ?? find(/head/i, /end|top/i);
      this.neckBone = find(/neck/i);
      for (const [side, s] of [
        [/left.*arm$|leftarm|arm_l|l_upperarm|upperarm_l/i, -1],
        [/right.*arm$|rightarm|arm_r|r_upperarm|upperarm_r/i, 1],
      ]) {
        const b = find(side, /fore|lower|hand/i);
        if (b) b.userData.lower = s;
      }
    }
    model.updateMatrixWorld(true);
    // Viloposer för rotationsberäkning
    this.rest = new Map();
    for (const b of [this.headBone, this.neckBone].filter(Boolean)) {
      const pw = new THREE.Quaternion();
      b.parent.getWorldQuaternion(pw);
      this.rest.set(b, { local: b.quaternion.clone(), parentWorld: pw });
    }
    // Normalisera storlek: huvudet ska hamna där de inbyggda avatarernas huvud är
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y || 1.7;
    const headPos = new THREE.Vector3();
    if (this.headBone) this.headBone.getWorldPosition(headPos);
    else headPos.set(0, box.max.y - height * 0.08, 0);
    const scale = 7 / height;
    model.scale.setScalar(scale);
    // Huvudbenet sitter vid nacken – placera det så att huvudets mitt hamnar där de inbyggda avatarernas huvud är
    model.position.set(-headPos.x * scale, 0.2 - headPos.y * scale, -headPos.z * scale);
    model.updateMatrixWorld(true);

    // Morph-targets (ARKit-namn)
    this.morphs = [];
    model.traverse((o) => {
      if (o.morphTargetDictionary && o.morphTargetInfluences) {
        for (const [name, idx] of Object.entries(o.morphTargetDictionary)) this.morphs.push({ mesh: o, idx, key: norm(name) });
      }
    });

    // Tillbehörsankare: världsjusterad grupp under huvudbenet
    if (this.headBone) {
      const align = new THREE.Group();
      const q = new THREE.Quaternion();
      this.headBone.getWorldQuaternion(q);
      const s = new THREE.Vector3();
      this.headBone.getWorldScale(s);
      align.quaternion.copy(q.invert());
      align.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
      this.headBone.add(align);
      align.add(this.anchorFace, this.anchorCrown);
      const u = 0.09 * scale; // ~9 cm mellan ögonvrårna
      this.anchorFace.position.set(0, 0.065 * scale, 0.085 * scale);
      this.anchorFace.scale.setScalar(u);
      this.anchorCrown.position.set(0, 0.17 * scale, -0.01 * scale);
      this.anchorCrown.scale.setScalar((0.095 * scale) / 0.66);
    }
    this.framing = { target: new THREE.Vector3(0, 0.35, 0), distance: 4.4 };
  }

  _rotateBone(bone, worldDelta, amount) {
    const r = this.rest.get(bone);
    if (!r) return;
    const d = new THREE.Quaternion().identity().slerp(worldDelta, amount);
    const pInv = r.parentWorld.clone().invert();
    const localDelta = pInv.multiply(d).multiply(r.parentWorld);
    bone.quaternion.copy(localDelta.multiply(r.local));
  }

  applyRig(rig, dt, t) {
    if (rig.speaking && !this._wasSpeaking) this.bounce.kick(1.5);
    this._wasSpeaking = rig.speaking;
    const b = this.bounce.update(rig.talk * 0.2, dt);
    this.body.position.y = b * 0.08 + Math.sin(t * 1.8) * 0.01;
    this.root.position.x = rig.pos.x * 0.4;
    this.root.position.y = rig.pos.y * 0.15;
    if (this.headBone) this._rotateBone(this.headBone, rig.quat, this.neckBone ? 0.65 : 1);
    if (this.neckBone) this._rotateBone(this.neckBone, rig.quat, 0.35);
  }

  animate(rig, dt, t, audio, face) {
    const vrm = this.vrm;
    if (vrm?.expressionManager) {
      const em = vrm.expressionManager;
      em.setValue('blinkLeft', rig.blinkR);
      em.setValue('blinkRight', rig.blinkL);
      em.setValue('aa', Math.min(rig.jaw * 1.2, 1));
      em.setValue('oh', rig.funnel * 0.8);
      em.setValue('ou', rig.pucker * 0.9);
      em.setValue('ee', Math.min(rig.wide * 0.7 + rig.smile * 0.2, 1) * (1 - rig.jaw * 0.5));
      em.setValue('happy', rig.smile * 0.6);
      em.setValue('angry', rig.browDown * 0.7);
      em.setValue('sad', rig.frown * 0.7);
      em.setValue('surprised', rig.browUp * rig.jaw * 1.2);
    }
    if (vrm?.lookAt) {
      vrm.lookAt.yaw = rig.lookX * 18;
      vrm.lookAt.pitch = rig.lookY * 12;
    }
    if (this.morphs.length) {
      const blend = face?.present ? face.blend : null;
      for (const m of this.morphs) {
        let v;
        if (blend) {
          // Speglad visning: vänster/höger byter plats
          let key = m.key;
          if (rig._mirror) key = key.replace(/left$/, '#').replace(/right$/, 'left').replace(/#$/, 'right');
          for (const [name, score] of Object.entries(blend)) {
            if (norm(name) === key) {
              v = score;
              break;
            }
          }
        } else if (m.key === 'jawopen' || m.key === 'mouthopen') v = rig.jaw;
        else if (m.key.startsWith('eyeblink')) v = Math.max(rig.blinkL, rig.blinkR);
        if (v !== undefined) m.mesh.morphTargetInfluences[m.idx] = v;
      }
    }
    vrm?.update(dt);
  }

  update(rig, dt, t, audio, face) {
    this.applyRig(rig, dt, t);
    this.animate(rig, dt, t, audio, face);
  }

  dispose() {
    if (this.vrm) VRMUtils.deepDispose(this.vrm.scene);
    else super.dispose();
  }
}
