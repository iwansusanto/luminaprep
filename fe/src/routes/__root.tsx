import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { User } from '../context/AuthContext'

interface MyRouterContext {
  auth: {
    user: User | null
    isAuthenticated: boolean
    login: (userData: User) => void
    logout: () => void
  }
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
})
