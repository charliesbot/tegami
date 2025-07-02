import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold">Welcome to Tegami</h1>
      <p className="mt-2">
        Your personal email newsletter service.
      </p>
      <a href="/cdn-cgi/access/login" className="mt-4 inline-block px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
        Login
      </a>
    </div>
  )
}