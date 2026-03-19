import type { RecycledIdea } from '#/gen/proto/api/v1/message_pb'

import { createFileRoute } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useGuide } from '#/features/guide/guide-context'
import { messageClient } from '#/lib/api'
import { RefreshCcw, Box, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_authenticated/_layout/recycle')({
    component: RecyclePage,
})

function RecyclePage() {
    const [recycledIdeas, setRecycledIdeas] = useState<RecycledIdea[]>([])
    const [loading, setLoading] = useState(true)
    const { setSteps } = useGuide()

    useEffect(() => {
        setSteps([
            {
                description: 'ここには、村の誰かが手放したアイデアの「かけら」が流れてきます。自分では思いつかないような意外なヒントが見つかるかもしれません！',
                targetId: 'recycle-list',
                title: 'リサイクルボックス'
            }
        ])
        return () => { setSteps([]); }
    }, [setSteps])

    const fetchRecycled = async () => {
        setLoading(true)
        try {
            const res = await messageClient.listRecycledIdeas({ limit: 20 })
            // Shuffle locally for extra randomness if the backend set is small
            const HALF = 0.5
            const shuffled = [...res.ideas].sort(() => Math.random() - HALF)
            setRecycledIdeas(shuffled)
        } catch (err) {
            console.error('Failed to fetch recycled ideas:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchRecycled()
    }, [])

    return (
        <div className="p-4 max-w-6xl mx-auto min-h-screen font-yusei">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-widest text-[#5a4a35] flex items-center gap-3">
                        <Box className="text-[#a48862]" size={36} />
                        リサイクルボックス
                    </h1>
                    <p className="mt-2 text-[#8e8571] font-bold text-sm">
                        誰かが手放したアイデアの「かけら」たちが集まる場所です。
                    </p>
                </div>
                <Button
                    variant="yellow"
                    onClick={() => { void fetchRecycled(); }}
                    className="flex items-center gap-2 rounded-2xl shadow-md"
                >
                    <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                    まぜる
                </Button>
            </div>

            {loading && recycledIdeas.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-[#c2baa6] font-black italic">
                    かけらを探しています...🦌
                </div>
            ) : recycledIdeas.length === 0 ? (
                <div id="recycle-list" className="flex flex-col items-center justify-center py-20 text-[#c2baa6] text-center border-4 border-dashed border-[#e8eed2] rounded-[40px] bg-white/30">
                    <Box size={64} className="mb-4 opacity-10" />
                    <p className="font-black text-xl">まだリサイクルされたアイデアは<br />ありません</p>
                </div>
            ) : (
                <div id="recycle-list" className="flex flex-col gap-4">
                    {recycledIdeas.map((idea) => (
                        <div
                            key={idea.id}
                            className="group relative flex flex-col md:flex-row md:items-center bg-white border-t-[2px] border-b-[8px] border-x-[3px] border-[#d5cba1] rounded-[24px] p-6 gap-4 shadow-sm transition-all duration-100 hover:brightness-[1.02] hover:translate-x-1"
                            style={{
                                boxShadow: '0 4px 0 0 #d5cba1'
                            }}
                        >
                            <div className="absolute -top-3 -left-3 h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-md rotate-12 scale-0 group-hover:scale-100 transition-transform z-10">
                                <Sparkles className="text-white fill-current" size={20} />
                            </div>

                            <div className="md:w-1/3 flex-shrink-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#87e968]" />
                                    <span className="text-[9px] font-black text-[#cbb698] tracking-widest uppercase">Idea Name</span>
                                </div>
                                <h3 className="text-xl font-black text-[#5a4a35] leading-tight">
                                    {idea.name}
                                </h3>
                            </div>

                            <div className="flex-1 md:border-l-2 md:border-[#fcfaf2] md:pl-6">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-[9px] font-black text-[#cbb698] tracking-widest uppercase">Description</span>
                                </div>
                                <p className="text-[#8e8571] text-sm leading-relaxed font-bold line-clamp-2 md:line-clamp-3">
                                    {idea.details}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
