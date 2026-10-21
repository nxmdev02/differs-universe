import { getActivity } from '../../../services/projects'
export default defineEventHandler((event) => getActivity(event, getRouterParam(event, 'id') || ''))
