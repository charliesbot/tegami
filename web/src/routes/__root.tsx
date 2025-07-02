import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="&.active]:font-bold">
          Public
        </Link>{' '}
        <Link to="/home" className="&.active]:font-bold">
          Home
        </Link>
        <a href="/cdn-cgi/access/logout" className="ml-auto">
          Logout
        </a>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})