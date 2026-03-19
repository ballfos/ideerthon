import { cn } from '#/utils/ui/cn'
import { User, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import React from 'react'

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    description: '最新技術が大好き。実現可能性やシステム化の視点から、現実的でスマートなアイデアを提案します。',
    id: 'engineer',
    name: '若手エンジニア'
  },
  {
    description: 'トレンドに敏感でスマホネイティブ。大人の常識を無視した、直感的なアイデアを提案します。',
    id: 'gen-z',
    name: '女子高生'
  },
  {
    description: 'ユーザー体験（UX）が最優先。使いやすさや、人の感情・美しさに寄り添うアイデアを提案します。',
    id: 'designer',
    name: 'デザイナー'
  },
  {
    description: 'コスパと実用性の鬼。日常生活のリアルな不便さや、生活者の視点から地に足のついたアイデアを提案します。',
    id: 'housewife',
    name: 'おばちゃん'
  },
  {
    description: 'バズと売上が正義。「誰にどう届けるか」「どうやってバズらせるか」というビジネスと集客の視点でアイデアを広げます。',
    id: 'marketer',
    name: '敏腕マーケター'
  },
  {
    description: '陽気でグローバルな視点から、ぶっ飛んだアイデアを提案します。',
    id: 'american-tom',
    name: 'アメリカ人トム'
  },
  {
    description: '事業化できるかが全て。「それで儲かるの？」「競合は？」と、ビジネスモデルとスケールの視点から鋭く突っ込みます。',
    id: 'investor',
    name: '辛口ベンチャーキャピタル'
  },
  {
    description: '純粋な好奇心のかたまり。複雑なことを嫌い、「それって面白いの？」「ゲームみたいにしよう！」と無邪気なアイデアを提案します。',
    id: 'kid',
    name: '小学生'
  }, {
    description: '豊富な知恵と深い共感力。ゆったりした時の流れの中で、物事の本質や人の心の機微を捉えた温かいアイデアを提案します。',
    id: 'grandma',
    name: 'おばあちゃん'
  }, {
    description: '最強のアイデアマン。あらゆる視点から斬新かつ共感性の高い最高のアイデアを提案します。',
    id: 'idea-deer',
    name: 'アイディアー🦌'
  },
]

interface AgentCardProps {
  agent: AgentPreset;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: keyof AgentPreset, value: string) => void;
  onApplyPreset: (preset: AgentPreset) => void;
  showRemove: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isOpen,
  onApplyPreset,
  onRemove,
  onToggle,
  onUpdate,
  showRemove
}) => {
  const [isNameTouched, setIsNameTouched] = React.useState(false)
  const [isDescTouched, setIsDescTouched] = React.useState(false)

  const isNameEmpty = agent.name.trim() === ""
  const isDescEmpty = agent.description.trim() === ""
  const showNameError = isNameTouched && isNameEmpty
  const showDescError = isDescTouched && isDescEmpty

  return (
    <div className={`bg-white rounded-[24px] border-2 transition-all ${isOpen ? 'border-[#ffcb05] shadow-md ring-4 ring-[#ffcb05]/10' : 'border-[#d5cba1] shadow-sm'}`}>
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#f9f1c8] border-2 border-[#d5cba1] flex items-center justify-center text-[#7a6446]">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-[#7a6446] truncate">{agent.name}</p>
            <p className="text-[10px] text-[#a3967d] font-bold uppercase tracking-wider truncate max-w-[200px]">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="p-2 hover:bg-red-50 text-[#c2baa6] hover:text-red-400 rounded-xl transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="text-[#a3967d]">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 border-t-2 border-[#fcfaf2] bg-[#fcfaf2]/30 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Preset Selector */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-[#a3967d] tracking-widest uppercase ml-1">役割をプリセットから選ぶ</span>
            <div className="flex flex-wrap gap-2">
              {AGENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onApplyPreset(p); }}
                  className="px-3 py-1.5 rounded-full bg-white border-2 border-[#d5cba1] hover:border-[#ffcb05] hover:bg-[#fff9e6] text-xs font-black text-[#7a6446] transition-all"
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { onApplyPreset({ description: '', id: 'custom', name: '' }); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fcfaf2]/50 border-2 border-dashed border-[#d5cba1] hover:border-[#ffcb05] hover:bg-[#fff9e6] text-xs font-black text-[#7a6446] transition-all"
              >
                <Pencil className="h-3 w-3" />
                自分で入力
              </button>
            </div>
          </div>

          {/* Form Fields - Vertical Layout */}
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#a3967d] tracking-widest uppercase ml-1">名前</label>
              <input
                type="text"
                value={agent.name}
                onChange={(e) => {
                  onUpdate('name', e.target.value)
                  if (!isNameTouched) setIsNameTouched(true)
                }}
                onBlur={() => { setIsNameTouched(true); }}
                maxLength={15}
                className={cn(
                  "w-full bg-white rounded-xl px-4 py-3 text-sm font-bold border-2 transition-colors",
                  showNameError ? "border-red-400 focus:border-red-500" : "border-[#d5cba1] focus:outline-none focus:border-[#ffcb05]"
                )}
                placeholder="例: 村の案内人 (ファシリテーター)"
              />
              <div className="mt-1 flex items-center justify-between">
                <div className="text-[10px] font-black">
                  {showNameError && (
                    <span className="text-red-500 animate-pulse">!! 名前を入力してください</span>
                  )}
                </div>
                <div className="text-[10px] font-black text-[#a3967d] opacity-60">
                  {agent.name.length} / 15
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#a3967d] tracking-widest uppercase ml-1">この子の役割</label>
              <textarea
                value={agent.description}
                onChange={(e) => {
                  onUpdate('description', e.target.value)
                  if (!isDescTouched) setIsDescTouched(true)
                }}
                onBlur={() => { setIsDescTouched(true); }}
                rows={2}
                maxLength={100}
                className={cn(
                  "w-full bg-white rounded-xl px-4 py-3 text-sm font-bold border-2 transition-colors resize-none",
                  showDescError ? "border-red-400 focus:border-red-500" : "border-[#d5cba1] focus:outline-none focus:border-[#ffcb05]"
                )}
                placeholder="この子の性格や、話し方の特徴を入力してください"
              />
              <div className="mt-1 flex items-center justify-between">
                <div className="text-[10px] font-black">
                  {showDescError && (
                    <span className="text-red-500 animate-pulse">!! 役割を入力してください</span>
                  )}
                </div>
                <div className="text-[10px] font-black text-[#a3967d] opacity-60">
                  {agent.description.length} / 100
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
