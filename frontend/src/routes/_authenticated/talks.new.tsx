import { useNavigate, createFileRoute, Link } from '@tanstack/react-router'
import { PageGuide } from '#/components/ui/page-guide'
import { useAuth } from '#/features/auth/use-auth'
import { useGuide } from '#/features/guide/guide-context'
import { cn } from '#/utils/ui/cn'
import { Plus, Loader2, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

import { AgentCard, AGENT_PRESETS, type AgentPreset } from '@/features/talks/components/agent-selector'

import { talkClient } from '../../lib/api'

export const Route = createFileRoute('/_authenticated/talks/new')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      custom: search.custom as string | undefined,
      presets: search.presets as string | undefined,
      topic: search.topic as string | undefined,
    }
  }
})

export function RouteComponent() {
  const { custom: searchCustom, presets: searchPresets, topic: searchTopic } = Route.useSearch()
  const [topic, setTopic] = useState(searchTopic ?? "")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  const isTopicTooLong = topic.length > 50
  const isTopicEmpty = topic.trim() === ""
  const showError = isTouched && (isTopicEmpty || isTopicTooLong)

  // Initialize with 3 agents (2 from presets + 1 custom/specific)
  const [selectedAgents, setSelectedAgents] = useState<AgentPreset[]>(() => {
    // 1. Load Presets if IDs provided
    const baseAgents: AgentPreset[] = [];
    if (searchPresets) {
      const ids = searchPresets.split(',')
      ids.forEach(id => {
        const found = AGENT_PRESETS.find(p => p.id === id)
        if (found) {
          baseAgents.push({ ...found, id: Math.random().toString(36).slice(2, 11) })
        }
      })
    }

    // 2. Default to first 2 presets if none specified or found
    const finalBaseAgents = baseAgents.length === 0
      ? AGENT_PRESETS.slice(0, 2).map(p => ({ ...p, id: Math.random().toString(36).slice(2, 11) }))
      : baseAgents;

    // 3. Add Grandma agent as 3rd default
    const grandma = AGENT_PRESETS.find(p => p.id === 'grandma')
    const initialThirdAgent: AgentPreset = grandma
      ? { ...grandma, id: 'grandma-init' }
      : { description: '', id: 'custom-init', name: '' }

    // If searchCustom is provided, it overrides the default third agent with a blank custom one.
    // This effectively removes the initial custom agent if a custom one was previously specified
    // but we now want to start fresh with the grandma preset.
    const thirdAgent: AgentPreset = (() => {
      if (searchCustom) {
        try {
          const parsed = JSON.parse(searchCustom) as { name: string; description: string }
          return { ...parsed, id: 'custom-init' }
        } catch (e) {
          console.error("Failed to parse search custom agent:", e)
          return { description: '', id: 'custom-init', name: '' }
        }
      }
      return initialThirdAgent
    })()

    return [...finalBaseAgents, thirdAgent]
  })
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const { setSteps } = useGuide()

  useEffect(() => {
    setSteps([
      {
        description: 'これから話し合いたいアイデアの題名を50文字以内で入力しましょう。',
        targetId: 'step-topic',
        title: 'テーマを決める'
      },
      {
        description: '議論に参加してほしいAIメンバーを選びます。プリセットから選ぶことも、自分で役割を作ることもできます。',
        targetId: 'step-members',
        title: 'メンバーを招待する'
      },
      {
        description: '準備ができたらボタンを押して、アイデアの村へ出発しましょう！',
        targetId: 'start-button-zone',
        title: 'トークを開始！'
      }
    ])
    return () => { setSteps([]); }
  }, [setSteps])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()

    if (!topic || !user || selectedAgents.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await talkClient.createTalk({
        agents: selectedAgents.map(a => ({ description: a.description, name: a.name })),
        topic
      })

      if (response.talk?.id) {
        void navigate({
          params: { talkId: response.talk.id },
          to: '/talks/$talkId'
        })
      }
    } catch (err: unknown) {
      console.error("Failed to create talk:", err)
      alert("トークの作成に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addAgent = () => {
    const newAgent = { description: "", id: Math.random().toString(36).slice(2, 11), name: "" }
    setSelectedAgents([...selectedAgents, newAgent])
    setOpenAccordion(newAgent.id)
  }

  const removeAgent = (id: string) => {
    setSelectedAgents(selectedAgents.filter(a => a.id !== id))
  }

  const updateAgent = (id: string, field: keyof AgentPreset, value: string) => {
    setSelectedAgents(selectedAgents.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const applyPreset = (id: string, preset: AgentPreset) => {
    setSelectedAgents(selectedAgents.map(a => a.id === id ? { ...preset, id: a.id } : a))
  }

  return (
    <div className="max-w-2xl mx-auto font-yusei overflow-hidden p-4">
      <div className="bg-white rounded-[40px] shadow-sm border-2 border-[#d5cba1] overflow-hidden">
        {/* Header */}
        <header className="relative bg-[#f9f1c8]/50 p-6 md:p-10 border-b-2 border-[#d5cba1] text-center">
          {/* Back Button */}
          <Link
            to="/home"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50 text-[#7a6446] hover:bg-white transition-all shadow-sm md:left-8"
          >
            <ArrowLeft size={24} />
          </Link>

          {/* Help Button */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 md:right-8">
            {useGuide().steps.length > 0 && <PageGuide />}
          </div>

          <h1 className="text-xl md:text-3xl font-black text-[#7a6446] tracking-widest leading-tight">
            新しいトークを始める
          </h1>
          <p className="text-[#a3967d] mt-2 font-black opacity-80 uppercase tracking-tighter text-[10px] md:text-xs">
            What theme shall we explore in Idea Village today?
          </p>
        </header>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="p-6 md:p-10 space-y-8 md:space-y-12">
          {/* STEP 1: Topic */}
          <section id="step-topic" className="space-y-4">
            <h2 className="text-base md:text-lg font-black text-[#7a6446] flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#ffcb05] text-[#7a6446] flex items-center justify-center text-sm shadow-sm ring-4 ring-[#ffcb05]/10 flex-shrink-0">1</span>
              テーマを決める
            </h2>
            <div className="md:pl-11">
              <div className="relative">
                <input
                  id="step-topic-input"
                  type="text"
                  placeholder="例) 新しいキャンプ用品のアイデア"
                  className={cn(
                    "w-full bg-white rounded-2xl px-5 py-3 md:px-6 md:py-4 text-base md:text-lg font-black text-[#5a4a35] border-4 transition-all placeholder:text-[#c2baa6]/50 shadow-inner",
                    showError ? "border-red-400 focus:border-red-500" : "border-[#e8eed2] focus:outline-none focus:border-[#ffcb05]"
                  )}
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value)
                    if (!isTouched) setIsTouched(true)
                  }}
                  onBlur={() => { setIsTouched(true); }}
                  maxLength={100} // Allow typing a bit over 50 for the error effect
                  required
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[10px] font-black">
                  {showError && (
                    <span className="text-red-500 animate-pulse">
                      {isTopicEmpty ? "!! テーマを入力してください" : "!! 50文字以内で入力してください"}
                    </span>
                  )}
                </div>
                <div className={cn(
                  "text-[10px] font-black transition-colors",
                  isTopicTooLong ? "text-red-500" : "text-[#a3967d] opacity-80"
                )}>
                  {topic.length} / 50
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2: Members */}
          <section id="step-members" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-black text-[#7a6446] flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#ffcb05] text-[#7a6446] flex items-center justify-center text-sm shadow-sm ring-4 ring-[#ffcb05]/10 flex-shrink-0">2</span>
                メンバーを招待する
              </h2>
              <button
                type="button"
                onClick={addAgent}
                className="group p-2 rounded-xl hover:bg-[#f9f1c8] border-2 border-transparent hover:border-[#d5cba1] transition-all flex items-center gap-2 text-[#a3967d] hover:text-[#7a6446]"
              >
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-[10px] md:text-xs font-black">追加</span>
              </button>
            </div>

            <div className="md:pl-11 space-y-4">
              {selectedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isOpen={openAccordion === agent.id}
                  onToggle={() => { setOpenAccordion(openAccordion === agent.id ? null : agent.id); }}
                  onRemove={() => { removeAgent(agent.id); }}
                  onUpdate={(field, value) => { updateAgent(agent.id, field, value); }}
                  onApplyPreset={(preset) => { applyPreset(agent.id, preset); }}
                  showRemove={selectedAgents.length > 1}
                />
              ))}
            </div>
          </section>

          {/* Submission */}
          <div id="start-button-zone" className="pt-4 flex flex-col items-center">
            {/* Validation Message Summary */}
            <div className="mb-4 min-h-[1.5rem] text-center">
              {(isTopicEmpty || isTopicTooLong || selectedAgents.length === 0 || selectedAgents.some(a => a.name.trim() === "" || a.description.trim() === "")) && (
                <p className="text-[11px] md:text-xs font-black text-red-500 bg-red-50 px-4 py-2 rounded-full border-2 border-red-100 animate-in fade-in slide-in-from-bottom-2">
                  {isTopicEmpty && "!! テーマを入力してください"}
                  {!isTopicEmpty && isTopicTooLong && "!! テーマは50文字以内にしてください"}
                  {!isTopicEmpty && !isTopicTooLong && selectedAgents.length === 0 && "!! メンバーを1人以上追加してください"}
                  {!isTopicEmpty && !isTopicTooLong && selectedAgents.length > 0 && selectedAgents.some(a => a.name.trim() === "" || a.description.trim() === "") && "!! すべてのメンバーの名前と役割を入力してください"}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isTopicEmpty ||
                isTopicTooLong ||
                selectedAgents.length === 0 ||
                selectedAgents.some(a => a.name.trim() === "" || a.description.trim() === "")
              }
              className="w-full md:w-auto md:px-16 py-5 md:py-6 bg-[#ffcb05] text-[#7a6446] text-lg md:text-xl font-black rounded-2xl md:rounded-[24px] border-b-8 border-[#e6b800] hover:translate-y-[-2px] hover:border-b-[10px] active:translate-y-[4px] active:border-b-[2px] transition-all disabled:opacity-50 disabled:grayscale disabled:translate-y-0 disabled:border-b-8 shadow-[0_10px_30px_-10px_rgba(255,203,5,0.5)] overflow-hidden"
            >
              <div className="absolute inset-x-0 h-1 top-0 bg-white/20" />
              <div className="flex items-center justify-center gap-3">
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    村へ向かう!!
                    <span className="text-xl md:text-2xl group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </div>
            </button>
            <p className="mt-4 text-[#c2baa6] text-[9px] md:text-[10px] font-black tracking-widest uppercase opacity-60">
              Start your journey into the Idea Village
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
