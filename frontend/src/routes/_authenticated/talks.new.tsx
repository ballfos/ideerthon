import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { talkClient } from '../../lib/api'
import { useAuth } from '@/features/auth/useAuth'

export const Route = createFileRoute('/_authenticated/talks/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const [topic, setTopic] = useState("")
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic || !user) return

    try {
      const response = await talkClient.createTalk({ topic })
      console.log("Created Talk:", response.talk)

      if (response.talk?.id) {
        navigate({
          to: '/talks/$talkId',
          params: { talkId: response.talk.id }
        })
      }
      setTopic("")
    } catch (err: any) {
      console.error("Failed to create talk:")
      console.error("  Message:", err.message)
      console.error("  Code:", err.code)
      console.error("  Full Error Object:", err)
    }
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <h1 className="text-xl font-bold mb-4">新しいTalkを作成</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <label className="flex flex-col gap-1">
          <span>トピック (Topic)</span>
          <input
            type="text"
            className="border p-2 rounded"
            placeholder="例) Reactについて"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
        >
          作成
        </button>
      </form>
    </div>
  )
}
