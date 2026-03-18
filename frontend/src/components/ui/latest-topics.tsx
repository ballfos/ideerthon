import { Link } from '@tanstack/react-router'
import { Leaf, Lightbulb, MessageSquare } from 'lucide-react'
import type { ReactNode } from 'react'

interface Topic {
  id: string
  title: string
  description: string
  icon: (props: { size: number; className?: string }) => ReactNode
  iconBg: string
}

const LATEST_TOPICS: Topic[] = [
  {
    id: '1',
    title: '今日のアイデア',
    description: '新しい日常の発見を共有しましょう',
    icon: (props) => <Lightbulb {...props} className="text-yellow-500" />,
    iconBg: 'bg-yellow-50',
  },
  {
    id: '2',
    title: '村の掲示板',
    description: 'みんなの声が集まる場所',
    icon: (props) => <MessageSquare {...props} className="text-blue-500" />,
    iconBg: 'bg-blue-50',
  },
  {
    id: '3',
    title: '自然との対話',
    description: '心休まる風景について',
    icon: (props) => <Leaf {...props} className="text-green-500" />,
    iconBg: 'bg-green-50',
  },
]

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
            className="group relative flex w-full items-center gap-3 rounded-2xl bg-white p-3 border-t-[2px] border-b-[8px] border-x-[3px] transition-all duration-100 hover:brightness-[1.02] hover:bg-[color-mix(in_srgb,var(--theme-color),white_85%)] active:brightness-95 active:translate-y-[10px] active:shadow-none active:border-b-[2px] active:bg-[var(--theme-color)] active:mb-[6px]"
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
            <div className="flex flex-col overflow-hidden">
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
  return (
    <TopicZone
      title="最新のトピック"
      topics={LATEST_TOPICS}
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
