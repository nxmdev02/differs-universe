import { getProject } from '../../services/projects'
export default defineEventHandler((event) => getProject(event, getRouterParam(event, 'id') || ''))
