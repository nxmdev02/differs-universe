const entries = new Map<string, { expires: number; value: unknown }>()
const pending = new Map<string, Promise<unknown>>()
export async function cached<T>(key: string, loader: () => Promise<T>, seconds = 60): Promise<T> {
  const entry = entries.get(key)
  if (entry && entry.expires > Date.now()) return entry.value as T
  if (pending.has(key)) return pending.get(key) as Promise<T>
  const request = loader()
    .then((value) => {
      if (entries.size > 500) entries.clear()
      entries.set(key, { value, expires: Date.now() + seconds * 1000 })
      return value
    })
    .finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}
