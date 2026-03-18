import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { messageClient } from '#/lib/api'
import { type Message } from '#/gen/proto/api/v1/message_pb'
import { Star, ChevronRight } from 'lucide-react'
import { TalkTopBar } from '#/features/talks/components/talk-top-bar'

export const Route = createFileRoute('/_authenticated/_layout/favorites')({
    component: FavoritesPage,
})

function FavoritesPage() {
    const [favorites, setFavorites] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const res = await messageClient.listFavoriteMessages({})
                setFavorites(res.messages)
            } catch (err) {
                console.error('Failed to fetch favorites:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchFavorites()
    }, [])

    return (
        <div className="flex flex-col h-screen bg-[#fcfaf2]">
            <TalkTopBar title="お気に入りメッセージ" />

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-[#c2baa6]">
                        読み込み中...
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#c2baa6] text-center">
                        <p>お気に入り登録された<br />メッセージはありません</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {favorites.map((msg) => (
                            <Link
                                key={msg.id}
                                to="/talks/$talkId"
                                params={{ talkId: msg.talkId }}
                                hash={`message-${msg.id}`}
                                className="block bg-white border-2 border-[#d5cba1] rounded-2xl p-4 shadow-sm hover:border-[#b8e6a0] transition-colors active:scale-[0.98]"
                            >
                                <div className="flex items-start gap-3">
                                    <Star className="h-5 w-5 text-[#ffcb05] fill-current shrink-0 mt-1" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[#7a6446] font-bold text-sm line-clamp-2">
                                            {msg.text}
                                        </p>
                                        <p className="text-[#c2baa6] text-[10px] mt-1">
                                            {new Date(Number(msg.createdAt?.seconds) * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-[#c2baa6] shrink-0 self-center" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
