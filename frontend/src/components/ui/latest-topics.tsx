import { Link } from '@tanstack/react-router'
import { Leaf, Lightbulb, MessageSquare, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTalks } from '@/features/talks'
import { Button } from './button'

interface Topic {
  id: string
  title: string
  description: string
  icon: (props: { size: number; className?: string }) => ReactNode
  iconBg: string
}



const RECOMMENDED_TOPICS: Topic[] = [
  {
    id: '4',
    title: '静かな読書会',
    description: 'おすすめの本を語り合いましょう',
    icon: (props) => <Lightbulb {...props} className="text-purple-500" />,
    iconBg: 'bg-purple-50',
  },
  {
    id: '5',
    title: '朝の散歩道',
    description: 'おすすめの散歩コースを紹介',
    icon: (props) => <Leaf {...props} className="text-emerald-500" />,
    iconBg: 'bg-emerald-50',
  },
  {
    id: '6',
    title: 'お茶の間トーク',
    description: 'リラックスして話せる空間',
    icon: (props) => <MessageSquare {...props} className="text-orange-500" />,
    iconBg: 'bg-orange-50',
  },
]

interface TopicZoneProps {
  title: string
  topics: Topic[]
  zoneBg: string
  borderColor: string
  zoneBorder: string
  headerAction?: ReactNode
}

function TopicZone({ title, topics, zoneBg, borderColor, zoneBorder }: TopicZoneProps) {
  return (
    <div className={`mx-auto w-full max-w-[500px] lg:max-w-none ${zoneBg} py-6 px-4 border-2 ${zoneBorder} font-yusei`}>
      <h2 className="mb-6 px-2 text-2xl font-black tracking-widest text-[#5a4a35]">
        {title}
      </h2>

      <div className="flex flex-col items-center gap-3">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            to="/talks/$talkId"
            params={{ talkId: topic.id }}
            className="group relative flex w-full max-w-full items-center gap-3 rounded-2xl bg-white p-3 border-t-[2px] border-b-[8px] border-x-[3px] transition-all duration-100 hover:brightness-[1.02] hover:bg-[color-mix(in_srgb,var(--theme-color),white_85%)] active:brightness-95 active:translate-y-[10px] active:shadow-none active:border-b-[2px] active:bg-[var(--theme-color)] active:mb-[6px] overflow-hidden"
            style={{
              borderColor: borderColor,
              boxShadow: `0 4px 0 0 ${borderColor}`,
              // @ts-ignore
              '--theme-color': borderColor
            }}
          >

            {/* アイコン（真円） */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${topic.iconBg} border-2 border-white shadow-sm`}>
              {/* アイコン関数を直接呼び出して描画 */}
              {topic.icon({ size: 20 })}
            </div>

            {/* テキスト部分 */}
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-lg font-black tracking-wider text-[#5a4a35] truncate leading-tight group-active:text-white">
                    {topic.title}
                </span>
                <span className="text-xs font-bold text-gray-500 truncate mt-0.5 group-active:text-white">
                    {topic.description}
                </span>
            </div>

            {/* 矢印アイコン */}
            <div className="ml-auto shrink-0 flex items-center self-end pb-1">
              <span className="font-black mr-1 text-xl group-active:text-white" style={{ color: borderColor }}>{'>'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function LatestTopics() {
  const { talks, loading } = useTalks()

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[500px] lg:max-w-none bg-[#fcfaf2]/50 py-12 px-4 border-2 border-[#e8eed2] font-yusei text-center">
        <p className="font-black text-[#5a4a35] opacity-50">読み込み中...🦌</p>
      </div>
    )
  }

  if (talks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[500px] lg:max-w-none bg-[#fcfaf2]/50 py-6 px-4 border-2 border-[#e8eed2] font-yusei flex flex-col gap-6">
        <h2 className="px-2 text-2xl font-black tracking-widest text-[#5a4a35]">最新のトピック</h2>
        <div className="flex flex-col items-center justify-center py-6 gap-6">
          <div className="flex flex-col items-center gap-2 opacity-60">
              <Lightbulb className="h-10 w-10 text-[#dbe3c6]" />
              <p className="text-sm font-bold text-[#7a6446]">履歴がまだありません</p>
          </div>
          <Link 
              to="/talks/new"
              className="w-full max-w-[280px]"
          >
              <Button variant="yellow" className="w-full py-6 text-lg shadow-md rounded-2xl group">
                  <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
                  トークをはじめる!!
              </Button>
          </Link>
        </div>
      </div>
    )
  }

  // 最新3件を表示するように変換
  const latestTalks: Topic[] = talks.slice(0, 3).map((talk) => ({
    id: talk.id,
    title: talk.topic || '無題のトーク',
    description: talk.updatedAt 
        ? `${new Date(talk.updatedAt.seconds * 1000).toLocaleString('ja-JP')} に更新`
        : 'まもなく開始',
    icon: (props) => <MessageSquare {...props} className="text-[#8c662d]" />,
    iconBg: 'bg-[#fcfaf2]',
  }))

  return (
    <TopicZone
      title="最新のトピック"
      topics={latestTalks}
      zoneBg="bg-[#fcfaf2]/50"
      zoneBorder="border-[#e8eed2]"
      borderColor="#d5cba1"
    />
  )
}

export function RecommendedTopics() {
  return (
    <TopicZone
      title="おすすめのトピック"
      topics={RECOMMENDED_TOPICS}
      zoneBg="bg-gray-50"
      zoneBorder="border-gray-200"
      borderColor="#9ca3af" // gray-400
    />
  )
}
