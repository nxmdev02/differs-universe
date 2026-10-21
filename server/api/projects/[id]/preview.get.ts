import { useStorage } from 'nitropack/runtime'
import { getProjects } from '../../../services/projects'
import { projectPreview } from '../../../utils/previews'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const project = (await getProjects(event)).projects.find((item) => item.id === id)
  const preview = project && projectPreview(project)
  if (!preview) throw createError({ statusCode: 404, statusMessage: 'Preview not available' })
  const image = await useStorage('assets:server').getItemRaw<Buffer>(`previews/${preview.filename}`)
  if (!image) throw createError({ statusCode: 404, statusMessage: 'Preview not available' })
  setResponseHeader(event, 'Content-Type', 'image/jpeg')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  return image
})
