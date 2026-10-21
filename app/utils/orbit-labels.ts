interface Point {
  x: number
  y: number
  radius: number
}
interface ProjectPoint extends Point {
  project: { name: string }
  labelX: number
  labelY: number
}
type Box = { left: number; right: number; top: number; bottom: number }
const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/** Keep names readable as bodies move, without moving their actual orbital positions. */
export function placeOrbitLabels<T extends ProjectPoint>(
  labels: T[],
  earth: Point,
  width: number,
  height: number,
  satellite?: { x: number; y: number },
) {
  const occupied: Box[] = [
    {
      left: earth.x - earth.radius - 10,
      right: earth.x + earth.radius + 10,
      top: earth.y - earth.radius - 8,
      bottom: earth.y + earth.radius + 52,
    },
  ]
  if (satellite)
    occupied.push({
      left: satellite.x - 28,
      right: satellite.x + 28,
      top: satellite.y - 32,
      bottom: satellite.y + 15,
    })
  const bodies: Box[] = labels.map((p) => ({
    left: p.x - p.radius - 6,
    right: p.x + p.radius + 6,
    top: p.y - p.radius - 6,
    bottom: p.y + p.radius + 6,
  }))
  for (const label of [...labels].sort((a, b) => a.y - b.y)) {
    const half = Math.min(width < 560 ? 63 : 96, Math.max(43, label.project.name.length * 3.1 + 8))
    const baseY = label.y + Math.max(15, label.radius) + 11
    let best: { x: number; y: number; score: number; box: Box } | undefined
    for (const dy of [0, 36, -45, 72, -82, 108, -118, 144, -154, 180, -190, 216, -226]) {
      for (const dx of [0, -52, 52]) {
        const x = Math.max(half + 10, Math.min(width - half - 10, label.x + dx))
        const y = Math.max(60, Math.min(height - 82, baseY + dy))
        const box = { left: x - half, right: x + half, top: y - 3, bottom: y + 31 }
        const collisions = [...occupied, ...bodies].filter((other) => overlaps(box, other)).length
        const earthCollision = overlaps(box, occupied[0]!) ? 1000000 : 0
        const score =
          earthCollision + collisions * 10000 + Math.abs(y - baseY) + Math.abs(x - label.x) * 0.6
        if (!best || score < best.score) best = { x, y, score, box }
      }
    }
    label.labelX = best!.x
    label.labelY = best!.y
    occupied.push(best!.box)
  }
}
