export function hashSeed(value: string) {
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return hash >>> 0
}
export function mockAnalytics(id: string) {
  const seed = hashSeed(id)
  const dau = seed % 5001
  return {
    dau,
    mau: dau * (3 + (seed % 23)),
    growthRate: (seed % 501) / 10 - 20,
    source: 'mock' as const,
  }
}
