import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import DashboardLayout from '../components/dashboard/DashboardLayout'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayoutWrapper,
})

function DashboardLayoutWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}
