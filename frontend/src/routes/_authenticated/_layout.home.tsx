import { createFileRoute } from '@tanstack/react-router'
import { LatestTopics, RecommendedTopics } from '#/components/ui/latest-topics'
import { useGuide } from '#/features/guide/guide-context'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/_layout/home')({
  component: RouteComponent,
})

function RouteComponent() {
  const { setSteps } = useGuide()

  useEffect(() => {
    setSteps([
      {
        description: '最近開いたトークが表示されます。ここから続きの議論を始められます。',
        targetId: 'latest-topics',
        title: 'あなたのアイデア村'
      },
      {
        description: 'どんな話題で話すか迷ったら、ここから面白いテーマを選んでみましょう！',
        targetId: 'recommended-topics',
        title: 'おすすめのテーマ'
      }
    ])
    return () => { setSteps([]); }
  }, [setSteps])

  return (
    <div className="flex w-full flex-col gap-6 pb-8 pt-4">
      {/* コンパクトな横長画像 */}
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[24px] shadow-lg border-[3px] border-white aspect-[16/9]">
        <img
          src="/images/deer_wide.png"
          alt="Peaceful deer in the forest"
          className="h-full w-full object-cover"
        />
      </div>

      {/* トピック表示ゾーンのコンテナ: デスクトップでは横並び、モバイルでは縦並び */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* 最新のトピック表示ゾーン（コンポーネント化） */}
        <div className="flex-1">
          <LatestTopics />
        </div>

        {/* おすすめのトピック表示ゾーン */}
        <div className="flex-1">
          <RecommendedTopics />
        </div>
      </div>
    </div>
  )
}
