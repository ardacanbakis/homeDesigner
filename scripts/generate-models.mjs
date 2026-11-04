/**
 * Generates GLTF furniture models from Three.js geometry.
 * Output: public/models/{kind}.gltf — one file per furniture kind.
 * Run: node scripts/generate-models.mjs
 */
import * as THREE from 'three';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/models');
mkdirSync(OUT_DIR, { recursive: true });

// ─── GLTF builder ──────────────────────────────────────────────────────────

class GltfBuilder {
  constructor() {
    this.floatChunks = [];  // Float32 data
    this.indexChunks = [];  // Uint16 data
    this.floatByteLen = 0;
    this.indexByteLen = 0;
    this.accessors = [];
    this.bufferViews = [];
    this.meshes = [];
    this.nodes = [];
    this.materials = [];
  }

  addMaterial({ color = [0.7, 0.5, 0.3], roughness = 0.8, metalness = 0.0, name = 'mat', opacity = 1, emissive = null } = {}) {
    const idx = this.materials.length;
    const mat = {
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [...color, opacity],
        metallicFactor: metalness,
        roughnessFactor: roughness,
      },
      doubleSided: opacity < 1,
    };
    if (opacity < 1) mat.alphaMode = 'BLEND';
    if (emissive) mat.emissiveFactor = emissive;
    this.materials.push(mat);
    return idx;
  }

  _pad4(len) {
    return (4 - (len % 4)) % 4;
  }

  _addFloatAccessor(array, type, min, max) {
    const pad = this._pad4(this.floatByteLen);
    if (pad > 0) {
      this.floatChunks.push(new Uint8Array(pad));
      this.floatByteLen += pad;
    }
    const byteOffset = this.floatByteLen;
    const data = new Float32Array(array);
    this.floatChunks.push(new Uint8Array(data.buffer));
    this.floatByteLen += data.byteLength;

    const bvIdx = this.bufferViews.length;
    this.bufferViews.push({
      buffer: 0,
      byteOffset: 0, // filled in later during build()
      byteLength: data.byteLength,
      target: 34962, // ARRAY_BUFFER
      _isFloat: true,
      _floatByteOffset: byteOffset,
    });

    const accIdx = this.accessors.length;
    const props = { bufferView: bvIdx, byteOffset: 0, componentType: 5126, count: data.length / (type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1), type };
    if (min != null) props.min = min;
    if (max != null) props.max = max;
    this.accessors.push(props);
    return accIdx;
  }

  _addIndexAccessor(array) {
    const pad = this._pad4(this.indexByteLen);
    if (pad > 0) {
      this.indexChunks.push(new Uint8Array(pad));
      this.indexByteLen += pad;
    }
    const byteOffset = this.indexByteLen;
    const data = new Uint16Array(array);
    this.indexChunks.push(new Uint8Array(data.buffer));
    this.indexByteLen += data.byteLength;

    const bvIdx = this.bufferViews.length;
    this.bufferViews.push({
      buffer: 0,
      byteOffset: 0,
      byteLength: data.byteLength,
      target: 34963, // ELEMENT_ARRAY_BUFFER
      _isFloat: false,
      _indexByteOffset: byteOffset,
    });

    const accIdx = this.accessors.length;
    this.accessors.push({ bufferView: bvIdx, byteOffset: 0, componentType: 5123, count: data.length, type: 'SCALAR' });
    return accIdx;
  }

  addMesh(geometry, materialIdx, translation = [0, 0, 0], rotation = null, name = 'mesh') {
    const geo = geometry.clone();
    if (!geo.index) {
      const indexed = THREE.BufferGeometryUtils
        ? THREE.BufferGeometryUtils.mergeVertices(geo)
        : geo;
      // If no index, create one via toNonIndexed approach — just keep non-indexed
    }
    geo.computeVertexNormals();

    const pos = Array.from(geo.attributes.position.array);
    const norm = Array.from(geo.attributes.normal.array);

    // Compute min/max for positions (required by GLTF spec)
    let minPos = [Infinity, Infinity, Infinity];
    let maxPos = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      minPos[0] = Math.min(minPos[0], pos[i]);
      minPos[1] = Math.min(minPos[1], pos[i + 1]);
      minPos[2] = Math.min(minPos[2], pos[i + 2]);
      maxPos[0] = Math.max(maxPos[0], pos[i]);
      maxPos[1] = Math.max(maxPos[1], pos[i + 1]);
      maxPos[2] = Math.max(maxPos[2], pos[i + 2]);
    }

    const posAcc = this._addFloatAccessor(pos, 'VEC3', minPos, maxPos);
    const normAcc = this._addFloatAccessor(norm, 'VEC3');

    let primitive = {
      attributes: { POSITION: posAcc, NORMAL: normAcc },
      material: materialIdx,
      mode: 4, // TRIANGLES
    };

    if (geo.index) {
      const idx = Array.from(geo.index.array);
      const idxAcc = this._addIndexAccessor(idx);
      primitive.indices = idxAcc;
    }

    const meshIdx = this.meshes.length;
    this.meshes.push({ name, primitives: [primitive] });

    const node = { name, mesh: meshIdx };
    if (translation[0] !== 0 || translation[1] !== 0 || translation[2] !== 0) {
      node.translation = translation;
    }
    if (rotation) node.rotation = rotation;

    this.nodes.push(node);
  }

  build() {
    // Merge all float chunks and index chunks into one buffer
    const floatBuf = mergeUint8(this.floatChunks, this.floatByteLen);
    const indexBuf = mergeUint8(this.indexChunks, this.indexByteLen);

    // Fix bufferView byte offsets: floats first, then indices
    for (const bv of this.bufferViews) {
      if (bv._isFloat) {
        bv.byteOffset = bv._floatByteOffset;
      } else {
        bv.byteOffset = this.floatByteLen + bv._indexByteOffset;
      }
      delete bv._isFloat;
      delete bv._floatByteOffset;
      delete bv._indexByteOffset;
    }

    const combined = new Uint8Array(floatBuf.length + indexBuf.length);
    combined.set(floatBuf, 0);
    combined.set(indexBuf, floatBuf.length);

    const b64 = Buffer.from(combined).toString('base64');

    return {
      asset: { version: '2.0', generator: 'HomeDesigner model builder' },
      scene: 0,
      scenes: [{ name: 'Scene', nodes: this.nodes.map((_, i) => i) }],
      nodes: this.nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: combined.length, uri: `data:application/octet-stream;base64,${b64}` }],
    };
  }
}

function mergeUint8(chunks, totalLen) {
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// ─── Color helpers ─────────────────────────────────────────────────────────

function hex(h) {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
}

// ─── Furniture geometry builders ───────────────────────────────────────────

function buildBed(b) {
  // w=2.0m, d=1.6m, h=0.5m — normalized to unit then scaled by caller
  const matFrame = b.addMaterial({ color: hex('#8B5E3C'), roughness: 0.7, name: 'frame' });
  const matMattress = b.addMaterial({ color: hex('#E8D5B7'), roughness: 0.9, name: 'mattress' });
  const matPillow = b.addMaterial({ color: hex('#FFFFFF'), roughness: 0.95, name: 'pillow' });

  // Frame base
  b.addMesh(new THREE.BoxGeometry(1, 0.08, 1), matFrame, [0, -0.21, 0], null, 'frame');
  // Headboard
  b.addMesh(new THREE.BoxGeometry(1, 0.55, 0.06), matFrame, [0, 0.08, -0.47], null, 'headboard');
  // Footboard
  b.addMesh(new THREE.BoxGeometry(1, 0.2, 0.05), matFrame, [0, -0.15, 0.47], null, 'footboard');
  // Mattress
  b.addMesh(new THREE.BoxGeometry(0.95, 0.22, 0.88), matMattress, [0, -0.04, 0], null, 'mattress');
  // Pillow
  b.addMesh(new THREE.BoxGeometry(0.55, 0.08, 0.22), matPillow, [0, 0.1, -0.3], null, 'pillow');
}

function buildWardrobe(b) {
  const matWood = b.addMaterial({ color: hex('#C4A882'), roughness: 0.6, name: 'wood' });
  const matHandle = b.addMaterial({ color: hex('#888888'), roughness: 0.2, metalness: 0.8, name: 'handle' });

  // Body
  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matWood, [0, 0, 0], null, 'body');
  // Left door panel
  b.addMesh(new THREE.BoxGeometry(0.48, 0.95, 0.04), matWood, [-0.24, 0, 0.47], null, 'door_L');
  // Right door panel
  b.addMesh(new THREE.BoxGeometry(0.48, 0.95, 0.04), matWood, [0.24, 0, 0.47], null, 'door_R');
  // Handles
  b.addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), matHandle, [-0.05, 0, 0.5], null, 'handle_L');
  b.addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), matHandle, [0.05, 0, 0.5], null, 'handle_R');
}

function buildDresser(b) {
  const matWood = b.addMaterial({ color: hex('#B8936A'), roughness: 0.65, name: 'wood' });
  const matHandle = b.addMaterial({ color: hex('#666666'), roughness: 0.3, metalness: 0.7, name: 'handle' });

  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matWood, [0, 0, 0], null, 'body');
  // Drawer lines (visual only — thin boxes)
  for (let i = 0; i < 4; i++) {
    const y = -0.35 + i * 0.23;
    b.addMesh(new THREE.BoxGeometry(0.98, 0.02, 0.05), matHandle, [0, y, 0.45], null, `drawer_line_${i}`);
    b.addMesh(new THREE.SphereGeometry(0.03, 8, 6), matHandle, [0, y + 0.09, 0.47], null, `handle_${i}`);
  }
}

function buildFridge(b) {
  const matSteel = b.addMaterial({ color: hex('#E0E0E0'), roughness: 0.15, metalness: 0.7, name: 'steel' });
  const matDark = b.addMaterial({ color: hex('#333333'), roughness: 0.2, metalness: 0.5, name: 'dark' });
  const matHandle = b.addMaterial({ color: hex('#AAAAAA'), roughness: 0.1, metalness: 0.9, name: 'handle' });

  // Body
  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matSteel, [0, 0, 0], null, 'body');
  // Freezer top seam
  b.addMesh(new THREE.BoxGeometry(1, 0.02, 0.92), matDark, [0, 0.28, 0], null, 'seam');
  // Handle (vertical bar on front right)
  b.addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), matHandle, [0.38, 0.1, 0.47], null, 'handle');
}

function buildWasher(b) {
  const matMetal = b.addMaterial({ color: hex('#F0F0F0'), roughness: 0.2, metalness: 0.4, name: 'metal' });
  const matDark = b.addMaterial({ color: hex('#222222'), roughness: 0.5, name: 'dark' });
  const matGlass = b.addMaterial({ color: hex('#99CCEE'), roughness: 0.05, metalness: 0.1, name: 'glass' });

  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matMetal, [0, 0, 0], null, 'body');
  // Porthole ring
  b.addMesh(new THREE.TorusGeometry(0.3, 0.04, 8, 20), matDark, [0, 0, 0.46], null, 'porthole_ring');
  // Porthole glass
  b.addMesh(new THREE.CircleGeometry(0.26, 20), matGlass, [0, 0, 0.47], null, 'porthole_glass');
  // Control panel top
  b.addMesh(new THREE.BoxGeometry(0.98, 0.12, 0.05), matDark, [0, 0.44, 0.43], null, 'panel');
}

function buildStove(b) {
  const matMetal = b.addMaterial({ color: hex('#555555'), roughness: 0.3, metalness: 0.6, name: 'metal' });
  const matBurner = b.addMaterial({ color: hex('#1A1A1A'), roughness: 0.7, name: 'burner' });
  const matKnob = b.addMaterial({ color: hex('#333333'), roughness: 0.4, metalness: 0.3, name: 'knob' });

  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matMetal, [0, 0, 0], null, 'body');
  // 4 burners on top (use low segments for smaller file)
  for (const [xi, zi] of [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]]) {
    b.addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), matBurner, [xi, 0.515, zi], null, 'burner');
    b.addMesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), matBurner, [xi, 0.52, zi], null, 'ring');
  }
  // Control knobs
  for (let i = 0; i < 4; i++) {
    b.addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), matKnob, [-0.3 + i * 0.2, -0.15, 0.47], null, `knob_${i}`);
  }
}

function buildSink(b) {
  const matCeramic = b.addMaterial({ color: hex('#FFFFFF'), roughness: 0.05, name: 'ceramic' });
  const matSteel = b.addMaterial({ color: hex('#AAAAAA'), roughness: 0.15, metalness: 0.8, name: 'steel' });

  b.addMesh(new THREE.BoxGeometry(1, 1, 0.9), matCeramic, [0, 0, 0], null, 'cabinet');
  // Basin
  b.addMesh(new THREE.BoxGeometry(0.7, 0.15, 0.55), matCeramic, [0, 0.43, 0], null, 'basin_outer');
  b.addMesh(new THREE.BoxGeometry(0.6, 0.13, 0.45), matSteel, [0, 0.45, 0], null, 'basin_inner');
  // Faucet
  b.addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 10), matSteel, [0, 0.62, -0.1], null, 'faucet_stem');
  b.addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 10), matSteel, [0, 0.65, 0.02], null, 'faucet_spout');
}

function buildSofa(b) {
  const matFabric = b.addMaterial({ color: hex('#7B6B8D'), roughness: 0.9, name: 'fabric' });
  const matLegs = b.addMaterial({ color: hex('#4A3728'), roughness: 0.6, name: 'legs' });

  // Seat cushion
  b.addMesh(new THREE.BoxGeometry(1, 0.22, 0.6), matFabric, [0, -0.12, 0.1], null, 'seat');
  // Back rest
  b.addMesh(new THREE.BoxGeometry(1, 0.5, 0.18), matFabric, [0, 0.12, -0.3], null, 'back');
  // Left armrest
  b.addMesh(new THREE.BoxGeometry(0.15, 0.38, 0.6), matFabric, [-0.42, -0.04, 0.1], null, 'arm_L');
  // Right armrest
  b.addMesh(new THREE.BoxGeometry(0.15, 0.38, 0.6), matFabric, [0.42, -0.04, 0.1], null, 'arm_R');
  // Legs
  for (const [xi, zi] of [[-0.42, 0.3], [0.42, 0.3], [-0.42, -0.22], [0.42, -0.22]]) {
    b.addMesh(new THREE.CylinderGeometry(0.04, 0.035, 0.15, 8), matLegs, [xi, -0.3, zi], null, 'leg');
  }
}

function buildTable(b) {
  const matWood = b.addMaterial({ color: hex('#A0734A'), roughness: 0.65, name: 'wood' });
  const matLegs = b.addMaterial({ color: hex('#7A5A38'), roughness: 0.6, name: 'legs' });

  // Tabletop
  b.addMesh(new THREE.BoxGeometry(1, 0.06, 0.9), matWood, [0, 0.47, 0], null, 'top');
  // 4 legs
  for (const [xi, zi] of [[-0.43, -0.38], [0.43, -0.38], [-0.43, 0.38], [0.43, 0.38]]) {
    b.addMesh(new THREE.BoxGeometry(0.07, 0.88, 0.07), matLegs, [xi, 0, zi], null, 'leg');
  }
}

function buildChair(b) {
  const matWood = b.addMaterial({ color: hex('#8B5E3C'), roughness: 0.7, name: 'wood' });
  const matSeat = b.addMaterial({ color: hex('#D4A76A'), roughness: 0.85, name: 'seat' });

  // Seat
  b.addMesh(new THREE.BoxGeometry(1, 0.07, 0.9), matSeat, [0, 0.06, 0.05], null, 'seat');
  // Backrest
  b.addMesh(new THREE.BoxGeometry(0.98, 0.5, 0.06), matWood, [0, 0.38, -0.42], null, 'back');
  // Horizontal back slat
  b.addMesh(new THREE.BoxGeometry(0.98, 0.07, 0.04), matSeat, [0, 0.2, -0.4], null, 'slat');
  // 4 legs
  for (const [xi, zi] of [[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]]) {
    b.addMesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), matWood, [xi, -0.22, zi], null, 'leg');
  }
}

function buildToilet(b) {
  const matCeramic = b.addMaterial({ color: hex('#F5F5F0'), roughness: 0.08, name: 'ceramic' });
  const matSeat = b.addMaterial({ color: hex('#EEEEEE'), roughness: 0.15, name: 'seat' });

  // Tank (back)
  b.addMesh(new THREE.BoxGeometry(0.75, 0.62, 0.22), matCeramic, [0, 0.2, -0.34], null, 'tank');
  // Tank lid
  b.addMesh(new THREE.BoxGeometry(0.77, 0.04, 0.24), matCeramic, [0, 0.52, -0.34], null, 'tank_lid');
  // Bowl
  b.addMesh(new THREE.CylinderGeometry(0.25, 0.28, 0.35, 16), matCeramic, [0, -0.08, 0.1], null, 'bowl');
  // Seat ring
  b.addMesh(new THREE.TorusGeometry(0.22, 0.045, 7, 16), matSeat, [0, 0.1, 0.1], null, 'seat_ring');
}

function buildBathtub(b) {
  const matWhite = b.addMaterial({ color: hex('#F8F8F8'), roughness: 0.05, name: 'tub' });
  const matInner = b.addMaterial({ color: hex('#D0E8F4'), roughness: 0.03, name: 'water' });
  const matChrome = b.addMaterial({ color: hex('#CCCCCC'), roughness: 0.05, metalness: 0.95, name: 'chrome' });

  // Outer hull
  b.addMesh(new THREE.BoxGeometry(1, 0.55, 0.9), matWhite, [0, 0, 0], null, 'hull');
  // Inner basin
  b.addMesh(new THREE.BoxGeometry(0.88, 0.28, 0.76), matInner, [0, 0.17, 0], null, 'basin');
  // Faucet
  b.addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 10), matChrome, [0.3, 0.42, -0.32], null, 'faucet');
  // Tap handles
  b.addMesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), matChrome, [0.35, 0.44, -0.26], null, 'tap');
}

function buildTV(b) {
  const matFrame = b.addMaterial({ color: hex('#111111'), roughness: 0.15, metalness: 0.6, name: 'frame' });
  const matScreen = b.addMaterial({ color: hex('#1A2040'), roughness: 0.0, metalness: 0.95, name: 'screen' });
  const matStand = b.addMaterial({ color: hex('#222222'), roughness: 0.3, metalness: 0.4, name: 'stand' });

  // Screen panel
  b.addMesh(new THREE.BoxGeometry(1, 0.9, 0.06), matFrame, [0, 0.05, 0], null, 'panel');
  // Display
  b.addMesh(new THREE.BoxGeometry(0.94, 0.84, 0.01), matScreen, [0, 0.05, 0.04], null, 'display');
  // Stand neck
  b.addMesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), matStand, [0, -0.46, 0], null, 'neck');
  // Stand base
  b.addMesh(new THREE.BoxGeometry(0.35, 0.03, 0.22), matStand, [0, -0.59, 0.04], null, 'base');
}

function buildDesk(b) {
  const matTop = b.addMaterial({ color: hex('#C8A878'), roughness: 0.5, name: 'top' });
  const matLegs = b.addMaterial({ color: hex('#888888'), roughness: 0.2, metalness: 0.7, name: 'legs' });

  // Desk surface
  b.addMesh(new THREE.BoxGeometry(1, 0.05, 0.9), matTop, [0, 0.48, 0], null, 'top');
  // Side panels (instead of legs — more modern look)
  b.addMesh(new THREE.BoxGeometry(0.04, 0.9, 0.88), matLegs, [-0.47, 0, 0], null, 'panel_L');
  b.addMesh(new THREE.BoxGeometry(0.04, 0.9, 0.88), matLegs, [0.47, 0, 0], null, 'panel_R');
  // Stretcher
  b.addMesh(new THREE.BoxGeometry(0.9, 0.04, 0.04), matLegs, [0, -0.28, -0.42], null, 'stretcher');
}

function buildStairs(b) {
  const matWood = b.addMaterial({ color: hex('#B8956A'), roughness: 0.75, name: 'wood' });
  const matRailing = b.addMaterial({ color: hex('#888888'), roughness: 0.2, metalness: 0.6, name: 'railing' });

  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const stepW = 1;
    const stepH = 1 / steps;
    const stepD = 1 / steps;
    b.addMesh(
      new THREE.BoxGeometry(stepW, stepH, stepD),
      matWood,
      [0, -0.5 + stepH * (i + 0.5), -0.5 + stepD * (i + 0.5)],
      null,
      `step_${i}`,
    );
  }
  // Railing posts
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    b.addMesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8),
      matRailing,
      [0.47, -0.5 + t, -0.5 + t],
      null,
      `post_${i}`,
    );
  }
  // Handrail
  b.addMesh(new THREE.BoxGeometry(0.04, 0.04, 1.05), matRailing, [0.47, 0.08, 0], null, 'handrail');
}

function buildNightstand(b) {
  const matWood = b.addMaterial({ color: hex('#9A7454'), roughness: 0.6, name: 'wood' });
  const matTop = b.addMaterial({ color: hex('#B38B66'), roughness: 0.5, name: 'top' });
  const matKnob = b.addMaterial({ color: hex('#C9A96E'), roughness: 0.25, metalness: 0.8, name: 'knob' });

  // Carcass on short legs, top slightly overhanging
  b.addMesh(new THREE.BoxGeometry(0.94, 0.72, 0.92), matWood, [0, 0.0, 0], null, 'body');
  b.addMesh(new THREE.BoxGeometry(1, 0.06, 1), matTop, [0, 0.39, 0], null, 'top');
  for (const [xi, zi] of [[-0.42, -0.4], [0.42, -0.4], [-0.42, 0.4], [0.42, 0.4]]) {
    b.addMesh(new THREE.BoxGeometry(0.07, 0.14, 0.07), matWood, [xi, -0.43, zi], null, 'leg');
  }
  // Two drawer fronts with knobs (front = +z)
  for (const y of [0.15, -0.18]) {
    b.addMesh(new THREE.BoxGeometry(0.86, 0.28, 0.03), matTop, [0, y, 0.47], null, 'drawer');
    b.addMesh(new THREE.SphereGeometry(0.035, 8, 6), matKnob, [0, y, 0.5], null, 'knob');
  }
}

function buildBookshelf(b) {
  const matWood = b.addMaterial({ color: hex('#7A5C42'), roughness: 0.65, name: 'wood' });
  const matBack = b.addMaterial({ color: hex('#5E4532'), roughness: 0.8, name: 'back' });
  const bookColors = ['#8C2F39', '#2F5D8C', '#C9A227', '#3E7C59', '#6B4E8C', '#D9D4C7', '#B5562E'];
  const matBooks = bookColors.map((c, i) => b.addMaterial({ color: hex(c), roughness: 0.8, name: `book_${i}` }));

  // Open front (+z): back panel at -z, two sides, five shelves
  b.addMesh(new THREE.BoxGeometry(1, 1, 0.06), matBack, [0, 0, -0.47], null, 'back');
  b.addMesh(new THREE.BoxGeometry(0.05, 1, 1), matWood, [-0.475, 0, 0], null, 'side_L');
  b.addMesh(new THREE.BoxGeometry(0.05, 1, 1), matWood, [0.475, 0, 0], null, 'side_R');
  const shelves = 5;
  for (let i = 0; i <= shelves; i++) {
    const y = -0.48 + (i * 0.96) / shelves;
    b.addMesh(new THREE.BoxGeometry(0.9, 0.035, 0.94), matWood, [0, y, 0], null, `shelf_${i}`);
  }
  // Rows of books on the lower four shelves (deterministic pseudo-random widths)
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let s = 0; s < 4; s++) {
    const base = -0.48 + (s * 0.96) / shelves + 0.0175;
    let x = -0.43;
    let n = 0;
    while (x < 0.36) {
      const bw = 0.04 + rnd() * 0.05;
      const bh = 0.11 + rnd() * 0.06;
      b.addMesh(new THREE.BoxGeometry(bw, bh, 0.7), matBooks[(s * 3 + n) % matBooks.length], [x + bw / 2, base + bh / 2, 0.05], null, 'book');
      x += bw + 0.008;
      n++;
      if (rnd() < 0.12) x += 0.08; // occasional gap
    }
  }
}

function buildLamp(b) {
  const matMetal = b.addMaterial({ color: hex('#2B2B2B'), roughness: 0.3, metalness: 0.8, name: 'metal' });
  const matShade = b.addMaterial({ color: hex('#F2E6CC'), roughness: 0.9, emissive: [0.55, 0.45, 0.28], name: 'shade' });

  b.addMesh(new THREE.CylinderGeometry(0.45, 0.5, 0.03, 24), matMetal, [0, -0.485, 0], null, 'base');
  b.addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 10), matMetal, [0, -0.11, 0], null, 'pole');
  b.addMesh(new THREE.CylinderGeometry(0.32, 0.5, 0.26, 24), matShade, [0, 0.37, 0], null, 'shade');
}

function buildPlant(b) {
  const matPot = b.addMaterial({ color: hex('#C2703D'), roughness: 0.85, name: 'pot' });
  const matSoil = b.addMaterial({ color: hex('#3B2A1E'), roughness: 1, name: 'soil' });
  const matLeaf = b.addMaterial({ color: hex('#3F7A3A'), roughness: 0.8, name: 'leaf' });
  const matLeaf2 = b.addMaterial({ color: hex('#5B9A4A'), roughness: 0.8, name: 'leaf_light' });
  const matStem = b.addMaterial({ color: hex('#4E3B2A'), roughness: 0.9, name: 'stem' });

  // Pot (lower third), soil, stem and a cluster of leafy blobs
  b.addMesh(new THREE.CylinderGeometry(0.34, 0.26, 0.32, 18), matPot, [0, -0.34, 0], null, 'pot');
  b.addMesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 18), matSoil, [0, -0.18, 0], null, 'soil');
  b.addMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.36, 8), matStem, [0, -0.02, 0], null, 'stem');
  const blobs = [
    [0, 0.26, 0, 0.27, matLeaf], [-0.22, 0.12, 0.08, 0.2, matLeaf2], [0.22, 0.14, -0.06, 0.21, matLeaf],
    [0.06, 0.1, 0.24, 0.18, matLeaf2], [-0.06, 0.16, -0.24, 0.19, matLeaf2], [0.04, 0.4, 0.02, 0.16, matLeaf2],
  ];
  for (const [x, y, z, r, mat] of blobs) {
    b.addMesh(new THREE.IcosahedronGeometry(r, 1), mat, [x, y, z], null, 'foliage');
  }
}

function buildCounter(b) {
  const matCab = b.addMaterial({ color: hex('#E9E4DA'), roughness: 0.55, name: 'cabinet' });
  const matTop = b.addMaterial({ color: hex('#6E6A66'), roughness: 0.25, metalness: 0.05, name: 'worktop' });
  const matKick = b.addMaterial({ color: hex('#2E2E2E'), roughness: 0.7, name: 'plinth' });
  const matHandle = b.addMaterial({ color: hex('#9A9A9A'), roughness: 0.2, metalness: 0.85, name: 'handle' });

  // Recessed plinth, cabinet body, worktop overhanging the front (+z)
  b.addMesh(new THREE.BoxGeometry(0.98, 0.1, 0.86), matKick, [0, -0.45, -0.05], null, 'plinth');
  b.addMesh(new THREE.BoxGeometry(1, 0.84, 0.94), matCab, [0, -0.0, -0.03], null, 'body');
  b.addMesh(new THREE.BoxGeometry(1, 0.06, 1), matTop, [0, 0.47, 0], null, 'worktop');
  // Two doors with a gap and bar handles
  for (const x of [-0.245, 0.245]) {
    b.addMesh(new THREE.BoxGeometry(0.48, 0.78, 0.02), matCab, [x, -0.01, 0.45], null, 'door');
    b.addMesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), matHandle, [x, 0.3, 0.47], null, 'handle');
  }
}

function buildShower(b) {
  const matTray = b.addMaterial({ color: hex('#F4F4F2'), roughness: 0.15, name: 'tray' });
  const matGlass = b.addMaterial({ color: hex('#BFDCEB'), roughness: 0.05, metalness: 0.1, opacity: 0.28, name: 'glass' });
  const matChrome = b.addMaterial({ color: hex('#D0D0D0'), roughness: 0.08, metalness: 0.95, name: 'chrome' });
  const matTile = b.addMaterial({ color: hex('#DDE6EA'), roughness: 0.3, name: 'tile' });

  // Low tray, tiled back wall (-z), glass on the front (+z) and right (+x)
  b.addMesh(new THREE.BoxGeometry(1, 0.04, 1), matTray, [0, -0.48, 0], null, 'tray');
  b.addMesh(new THREE.BoxGeometry(1, 0.94, 0.02), matTile, [0, 0.01, -0.49], null, 'back_wall');
  b.addMesh(new THREE.BoxGeometry(0.98, 0.9, 0.01), matGlass, [0, -0.01, 0.49], null, 'glass_front');
  b.addMesh(new THREE.BoxGeometry(0.01, 0.9, 0.98), matGlass, [0.49, -0.01, 0], null, 'glass_side');
  // Chrome frame along the glass edges
  b.addMesh(new THREE.BoxGeometry(0.02, 0.92, 0.02), matChrome, [0.49, -0.0, 0.49], null, 'post');
  b.addMesh(new THREE.BoxGeometry(1, 0.015, 0.015), matChrome, [0, 0.45, 0.49], null, 'rail_front');
  b.addMesh(new THREE.BoxGeometry(0.015, 0.015, 1), matChrome, [0.49, 0.45, 0], null, 'rail_side');
  // Riser pipe and rain head on the back wall
  b.addMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), matChrome, [-0.2, 0.15, -0.46], null, 'riser');
  b.addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 20), matChrome, [-0.2, 0.42, -0.34], null, 'head');
  b.addMesh(new THREE.BoxGeometry(0.015, 0.015, 0.12), matChrome, [-0.2, 0.42, -0.42], null, 'arm');
  b.addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), matChrome, [-0.2, -0.05, -0.47], null, 'valve');
}

// ─── Generate all models ────────────────────────────────────────────────────

const MODELS = {
  bed: buildBed,
  wardrobe: buildWardrobe,
  dresser: buildDresser,
  fridge: buildFridge,
  washer: buildWasher,
  stove: buildStove,
  sink: buildSink,
  sofa: buildSofa,
  table: buildTable,
  chair: buildChair,
  toilet: buildToilet,
  bathtub: buildBathtub,
  tv: buildTV,
  desk: buildDesk,
  stairs: buildStairs,
  nightstand: buildNightstand,
  bookshelf: buildBookshelf,
  lamp: buildLamp,
  plant: buildPlant,
  counter: buildCounter,
  shower: buildShower,
};

let totalSize = 0;
for (const [kind, builder] of Object.entries(MODELS)) {
  const b = new GltfBuilder();
  builder(b);
  const gltf = b.build();
  const json = JSON.stringify(gltf);
  const outPath = join(OUT_DIR, `${kind}.gltf`);
  writeFileSync(outPath, json);
  const kb = (json.length / 1024).toFixed(1);
  totalSize += json.length;
  console.log(`  ✓ ${kind}.gltf  ${kb} KB`);
}
console.log(`\n  Total: ${(totalSize / 1024).toFixed(0)} KB across ${Object.keys(MODELS).length} models`);
