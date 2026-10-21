import { getProjects } from '../../services/projects'
export default defineEventHandler((event) => getProjects(event))
