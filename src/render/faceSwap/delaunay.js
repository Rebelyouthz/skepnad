// Delaunay-triangulering (Bowyer–Watson) för ansiktspunkter.
// points: [[x, y], …] → platt lista med triangelindex [a, b, c, a, b, c, …].
export function delaunay(points) {
  const n = points.length;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const d = Math.max(maxX - minX, maxY - minY) * 20;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pts = [...points, [cx - d, cy - d], [cx + d, cy - d], [cx, cy + d]];
  const circum = (a, b, c) => {
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const [qx, qy] = pts[c];
    const D = 2 * (ax * (by - qy) + bx * (qy - ay) + qx * (ay - by));
    if (Math.abs(D) < 1e-12) return { x: 0, y: 0, r2: Infinity };
    const ux = ((ax * ax + ay * ay) * (by - qy) + (bx * bx + by * by) * (qy - ay) + (qx * qx + qy * qy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (qx - bx) + (bx * bx + by * by) * (ax - qx) + (qx * qx + qy * qy) * (bx - ax)) / D;
    return { x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let tris = [{ v: [n, n + 1, n + 2], c: circum(n, n + 1, n + 2) }];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    const bad = [];
    const keep = [];
    for (const t of tris) ((px - t.c.x) ** 2 + (py - t.c.y) ** 2 < t.c.r2 ? bad : keep).push(t);
    const edges = new Map();
    for (const t of bad) {
      for (let k = 0; k < 3; k++) {
        const a = t.v[k];
        const b = t.v[(k + 1) % 3];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, edges.has(key) ? null : [a, b]);
      }
    }
    for (const e of edges.values()) if (e) keep.push({ v: [e[0], e[1], i], c: circum(e[0], e[1], i) });
    tris = keep;
  }
  const out = [];
  for (const t of tris) if (t.v.every((v) => v < n)) out.push(...t.v);
  return out;
}
