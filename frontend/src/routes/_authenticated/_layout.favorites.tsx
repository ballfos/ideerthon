import { createFileRoute, Link } from '@tanstack/react-router'
import { useGuide } from '#/features/guide/guide-context'
import { type Message } from '#/gen/proto/api/v1/message_pb'
import { messageClient } from '#/lib/api'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_authenticated/_layout/favorites')({
    component: FavoritesPage,
})

function FavoritesPage() {
    const [favorites, setFavorites] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const { setSteps } = useGuide()

    useEffect(() => {
        setSteps([
            {
                description: 'トークの中で「星」をつけたメッセージがここに集まります。後で見返したい大切なヒントはどんどんお気に入り登録しましょう！',
                targetId: 'favorites-list',
                title: 'お気に入り'
            }
        ])
        return () => { setSteps([]); }
    }, [setSteps])

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
        <div className="p-4 max-w-4xl mx-auto min-h-screen font-yusei">
            <div className="mb-8 font-yusei">
                <h1 className="text-2xl font-black tracking-widest text-[#5a4a35]">
                    お気に入りメッセージ
                </h1>
            </div>

            <div className="w-full font-yusei">
                {loading ? (
                    <div className="flex h-40 items-center justify-center text-[#c2baa6] font-black">
                        読み込み中...
                    </div>
                ) : favorites.length === 0 ? (
                    <div id="favorites-list" className="flex flex-col items-center justify-center py-12 text-[#c2baa6] text-center border-2 border-dashed border-[#e8eed2] rounded-[32px] bg-[#fcfaf2]/30">
                        <Star className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-black text-lg">お気に入り登録された<br />メッセージはありません</p>
                    </div>
                ) : (
                    <div id="favorites-list" className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                        {favorites.map((msg) => (
                            <Link
                                key={msg.id}
                                to="/talks/$talkId"
                                params={{ talkId: msg.talkId }}
                                hash={`message-${msg.id}`}
                                className="group relative flex flex-col bg-white border-t-[2px] border-b-[8px] border-x-[3px] border-[#d5cba1] rounded-[24px] p-5 shadow-sm transition-all duration-100 hover:brightness-[1.02] active:translate-y-[6px] active:border-b-[2px] active:mb-[6px]"
                                style={{
                                    boxShadow: '0 4px 0 0 #d5cba1'
                                }}
                            >
                                <div className="flex items-start gap-4 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50 border-2 border-white shadow-sm">
                                        <Star className="h-5 w-5 text-[#ffcb05] fill-current" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-[#cbb698] tracking-wider uppercase">
                                                    {msg.agentName || "Starred Message"}
                                                </span>
                                                {msg.ideaName && (
                                                    <span className="px-2 py-0.5 bg-[#4b9635] text-white text-[9px] font-black rounded-full uppercase tracking-tighter shadow-sm">
                                                        {msg.ideaName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[#5a4a35] font-black text-base leading-relaxed line-clamp-3">
                                            {msg.text}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-auto pt-3 border-t border-[#fcfaf2] flex items-center justify-between">
                                    <span className="text-[#c2baa6] text-[10px] font-black">
                                        {new Date(Number(msg.createdAt?.seconds) * 1000).toLocaleString('ja-JP')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#8c662d] text-[10px] font-black tracking-tighter hover:underline">
                                            VIEW TALK
                                        </span>
                                        <span className="font-black text-xl text-[#d5cba1] group-hover:translate-x-1 transition-transform">
                                            {'>'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
