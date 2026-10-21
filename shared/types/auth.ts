export interface AuthUser {
  sub: string
  email: string
  name: string
}
export interface AuthStatus {
  enabled: boolean
  configured: boolean
  user: AuthUser | null
}
