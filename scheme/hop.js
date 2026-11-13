const R = 6

const xy = (p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : p)
const n = (v) => v.toFixed(1)

function cross(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y
  const sx = d.x - c.x, sy = d.y - c.y
  const den = rx * sy - ry * sx
  if (Math.abs(den) < 1e-6) return null
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null
  return { t, x: a.x + t * rx, y: a.y + t * ry }
}

function plain(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join(' ')
}

function withHops(pts, hits) {
  let d = `M${n(pts[0].x)} ${n(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len
    const on = (hits ?? []).filter((h) => h.seg === i).sort((u, v) => u.t - v.t)
    let last = -Infinity
    for (const h of on) {
      const dist = h.t * len
      if (dist < R + 1 || len - dist < R + 1 || dist - last < R * 2) continue
      const sx = h.x - dx * R, sy = h.y - dy * R
      const ex = h.x + dx * R, ey = h.y + dy * R
      const mx = h.x + dy * R, my = h.y - dx * R
      const side = (ex - sx) * (my - sy) - (ey - sy) * (mx - sx)
      d += ` L${n(sx)} ${n(sy)} A${R} ${R} 0 0 ${side > 0 ? 1 : 0} ${n(ex)} ${n(ey)}`
      last = dist
    }
    d += ` L${n(b.x)} ${n(b.y)}`
  }
  return d
}

// фаза (pole 0) перешагивает ноль полукругом; ноль остаётся прямым
export function applyHops(wires) {
  const phase = wires.filter((w) => w.pole === 0 && w.kind !== 'pe')
  const neutral = wires.filter((w) => w.pole === 1)
  for (const w of wires) w._pts = w.pts.map(xy)
  const hits = new Map()
  for (const p of phase) {
    for (let i = 0; i < p._pts.length - 1; i++) {
      for (const q of neutral) {
        for (let j = 0; j < q._pts.length - 1; j++) {
          const hit = cross(p._pts[i], p._pts[i + 1], q._pts[j], q._pts[j + 1])
          if (!hit) continue
          const list = hits.get(p) ?? []
          list.push({ seg: i, ...hit })
          hits.set(p, list)
        }
      }
    }
  }
  for (const w of wires) w.d = w.pole === 0 && w.kind !== 'pe' ? withHops(w._pts, hits.get(w)) : plain(w._pts)
}
