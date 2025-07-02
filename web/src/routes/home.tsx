
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/home')({
  component: Home,
})

function Home() {
  const { data: me } = useSuspenseQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me')
      if (!res.ok) {
        throw new Error('Failed to fetch user info')
      }
      return res.json()
    },
  })

  const { data: inbox } = useSuspenseQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await fetch('/api/inbox')
      if (!res.ok) {
        throw new Error('Failed to fetch inbox')
      }
      return res.json()
    },
  })

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold">Welcome, {me.email}</h1>
      <h2 className="text-xl font-bold mt-4">Inbox</h2>
      <ul className="mt-4 space-y-2">
        {inbox.items.map((email) => (
          <li key={email.id} className="p-2 border rounded">
            <p className="font-semibold">{email.sender}</p>
            <p>{email.subject}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
