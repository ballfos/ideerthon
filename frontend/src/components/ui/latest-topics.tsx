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
  presetAgentIds?: string[]
  customAgent?: { name: string; description: string }
}



const RECOMMENDED_TOPICS: Topic[] = [
  {
    id: 'rec-1',
    title: '未来の移動手段',
    description: '空飛ぶ車やテレポーテーションについて語る',
    icon: (props) => <Lightbulb {...props} className="text-blue-500" />,
    iconBg: 'bg-blue-50',
    presetAgentIds: ['engineer', 'investor'],
    customAgent: { name: '未来学者', description: '22世紀の科学技術のトレンドを予測し、社会への影響を説く専門家' }
  },
  {
    id: 'rec-2',
    title: '猫との共生都市',
    description: '猫も人間も幸せになれる街作りのアイデア',
    icon: (props) => <Leaf {...props} className="text-orange-500" />,
    iconBg: 'bg-orange-50',
    presetAgentIds: ['designer', 'housewife'],
    customAgent: { name: '動物行動学者', description: '猫のストレスを最小限に抑え、幸福度を最大化するアプローチを考える' }
  },
  {
    id: 'rec-3',
    title: '伝説のカレー作り',
    description: '100年後も語り継がれる究極のレシピ',
    icon: (props) => <MessageSquare {...props} className="text-red-500" />,
    iconBg: 'bg-red-50',
    presetAgentIds: ['housewife', 'marketer'],
    customAgent: { name: 'スパイス博士', description: 'スパイスの化学反応と薬膳としての効果を極めた研究者' }
  },
  {
    id: 'rec-4',
    title: '深海ホテル計画',
    description: '海の底で快適に過ごすためのアイデア',
    icon: (props) => <Lightbulb {...props} className="text-cyan-500" />,
    iconBg: 'bg-cyan-50',
    presetAgentIds: ['engineer', 'investor'],
    customAgent: { name: '深海冒険家', description: '未知の深海生物の生態と海底火山のエネルギー活用に詳しい' }
  },
  {
    id: 'rec-5',
    title: '嘘のないSNS',
    description: '正直者が得をする次世代の交流ツール',
    icon: (props) => <MessageSquare {...props} className="text-emerald-500" />,
    iconBg: 'bg-emerald-50',
    presetAgentIds: ['gen-z', 'philosopher'], // Note: 'philosopher' might not exist, using marketer if missing or just keeping the custom logic
    customAgent: { name: '嘘を見抜く審判', description: '発言の整合性と心理状態を瞬時に分析し、不誠実を許さない' }
  },
  {
    id: 'rec-6',
    title: '夢を録画する機械',
    description: '起きた後に夢を振り返れるデバイス',
    icon: (props) => <Lightbulb {...props} className="text-indigo-500" />,
    iconBg: 'bg-indigo-50',
    presetAgentIds: ['engineer', 'designer'],
    customAgent: { name: '映画監督', description: '夢という断片的な映像から、壮大なストーリーを作り上げる' }
  },
  {
    id: 'rec-7',
    title: '全自動・片付けロボ',
    description: '絶対に部屋が散らからない究極の家電',
    icon: (props) => <Leaf {...props} className="text-yellow-500" />,
    iconBg: 'bg-yellow-50',
    presetAgentIds: ['housewife', 'kid'],
    customAgent: { name: 'ロボット職人', description: '整理整頓だけでなく、住人の心まで癒やす動きを追求する' }
  },
  {
    id: 'rec-8',
    title: '宇宙農業の夜明け',
    description: '火星で最高においしいトマトを育てる',
    icon: (props) => <Leaf {...props} className="text-red-400" />,
    iconBg: 'bg-red-50',
    presetAgentIds: ['engineer', 'housewife'],
    customAgent: { name: 'NASA研究員', description: '重力の少ない環境での植物栽培に特化した気鋭の研究者' }
  },
  {
    id: 'rec-9',
    title: '無人島サバイバルAI',
    description: '漂流したときに生き残るための知恵',
    icon: (props) => <MessageSquare {...props} className="text-amber-700" />,
    iconBg: 'bg-amber-50',
    presetAgentIds: ['idea-deer', 'american-tom'],
    customAgent: { name: '元軍人', description: '極限状態でのサバイバル術と心理コントロールのスペシャリスト' }
  },
  {
    id: 'rec-10',
    title: '透明マントの日常',
    description: 'もし誰もが透明になれる社会になったら？',
    icon: (props) => <Lightbulb {...props} className="text-slate-400" />,
    iconBg: 'bg-slate-50',
    presetAgentIds: ['gen-z', 'investor'],
    customAgent: { name: '社会心理学者', description: '姿が見えなくなったとき、人間のプライバシーと犯罪心理はどう変わるか分析する' }
  }
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
            to="/talks/new"
            search={{ 
                topic: topic.title, 
                presets: topic.presetAgentIds?.join(','),
                custom: topic.customAgent ? JSON.stringify(topic.customAgent) : undefined 
            }}
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
      <div id="latest-topics">
      <div className="mx-auto w-full max-w-[500px] lg:max-w-none bg-[#fcfaf2]/50 py-12 px-4 border-2 border-[#e8eed2] font-yusei flex flex-col items-center justify-center gap-6">
        <h2 className="text-2xl font-black tracking-widest text-[#5a4a35]">最新のトピック</h2>
        <div className="flex flex-col items-center gap-2 opacity-60">
            <Lightbulb className="h-10 w-10 text-[#dbe3c6]" />
            <p className="text-sm font-bold text-[#7a6446]">履歴がまだありません</p>
        </div>
        <Link 
            to="/talks/new"
            search={{ topic: undefined, presets: undefined, custom: undefined }}
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
    <div id="latest-topics">
    <TopicZone
      title="最新のトピック"
      topics={latestTalks}
      zoneBg="bg-[#fcfaf2]/50"
      zoneBorder="border-[#e8eed2]"
      borderColor="#d5cba1"
    />
    </div>
  )
}

export function RecommendedTopics() {
  // ランダムに3つ選ぶ
  const randomTopics = [...RECOMMENDED_TOPICS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  return (
    <div id="recommended-topics">
      <TopicZone
        title="おすすめのトピック"
      topics={randomTopics}
      zoneBg="bg-gray-50"
      zoneBorder="border-gray-200"
      borderColor="#9ca3af" // gray-400
    />
    </div>
  )
}
