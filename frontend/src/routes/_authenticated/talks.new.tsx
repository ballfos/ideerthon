import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { talkClient } from '../../lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { Plus, Loader2 } from 'lucide-react'
import { AgentCard, AGENT_PRESETS, type AgentPreset } from '@/features/talks/components/agent-selector'

export const Route = createFileRoute('/_authenticated/talks/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const [topic, setTopic] = useState("")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize with 3 agents
  const [selectedAgents, setSelectedAgents] = useState<AgentPreset[]>(
    AGENT_PRESETS.slice(0, 3).map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9) }))
  )
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic || !user || selectedAgents.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await talkClient.createTalk({
        topic,
        agents: selectedAgents.map(a => ({ name: a.name, description: a.description }))
      })

      if (response.talk?.id) {
        navigate({
          to: '/talks/$talkId',
          params: { talkId: response.talk.id }
        })
      }
    } catch (err: any) {
      console.error("Failed to create talk:", err)
      alert("トークの作成に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addAgent = () => {
    const newAgent = { id: Math.random().toString(36).substr(2, 9), name: "新しいエージェント", description: "役割を教えてね" }
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
    <div className="min-h-screen bg-[#fcfaf2] p-4 md:p-8 font-yusei">
      <div className="max-w-2xl mx-auto bg-white rounded-[32px] shadow-sm border-2 border-[#d5cba1] overflow-hidden">
        {/* Header */}
        <header className="bg-[#f9f1c8] p-8 border-b-2 border-[#d5cba1] text-center">
          <h1 className="text-3xl font-black text-[#7a6446] tracking-widest">
            新しいトークを始める
          </h1>
          <p className="text-[#a3967d] mt-2 font-bold opacity-80 uppercase tracking-tighter text-sm">
            What theme shall we explore in Idea Village today?
          </p>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-12">
          {/* STEP 1: Topic */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-[#7a6446] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#ffcb05] text-[#7a6446] flex items-center justify-center text-sm shadow-sm ring-4 ring-[#ffcb05]/10">1</span>
              テーマを決める
            </h2>
            <div className="pl-10">
              <input
                type="text"
                placeholder="例) 新しいキャンプ用品のアイデア"
                className="w-full bg-white rounded-2xl px-6 py-4 text-lg font-black text-[#5a4a35] border-4 border-[#e8eed2] focus:outline-none focus:border-[#ffcb05] transition-all placeholder:text-[#c2baa6]/50 shadow-inner"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>
          </section>

          {/* STEP 2: Members */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#7a6446] flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#ffcb05] text-[#7a6446] flex items-center justify-center text-sm shadow-sm ring-4 ring-[#ffcb05]/10">2</span>
                メンバーを招待する
              </h2>
              <button
                type="button"
                onClick={addAgent}
                className="group p-2 rounded-full hover:bg-[#f9f1c8] border-2 border-transparent hover:border-[#d5cba1] transition-all flex items-center gap-2 text-[#a3967d] hover:text-[#7a6446]"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs font-black">追加</span>
              </button>
            </div>

            <div className="pl-10 space-y-4">
              {selectedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isOpen={openAccordion === agent.id}
                  onToggle={() => setOpenAccordion(openAccordion === agent.id ? null : agent.id)}
                  onRemove={() => removeAgent(agent.id)}
                  onUpdate={(field, value) => updateAgent(agent.id, field, value)}
                  onApplyPreset={(preset) => applyPreset(agent.id, preset)}
                  showRemove={selectedAgents.length > 1}
                />
              ))}
            </div>
          </section>

          {/* Submission */}
          <div className="pt-6 flex flex-col items-center">
            <button
              type="submit"
              disabled={isSubmitting || !topic.trim() || selectedAgents.length === 0}
              className="group relative px-16 py-6 bg-[#ffcb05] text-[#7a6446] text-xl font-black rounded-[24px] border-b-8 border-[#e6b800] hover:translate-y-[-2px] hover:border-b-[10px] active:translate-y-[4px] active:border-b-[2px] transition-all disabled:opacity-50 disabled:grayscale disabled:translate-y-0 disabled:border-b-8 shadow-[0_10px_30px_-10px_rgba(255,203,5,0.5)] overflow-hidden"
            >
              <div className="absolute inset-x-0 h-1 top-0 bg-white/20" />
              <div className="flex items-center gap-3">
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    村へ向かう!!
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </div>
            </button>
            <p className="mt-4 text-[#c2baa6] text-[10px] font-black tracking-widest uppercase opacity-60">
              Start your journey into the Idea Village
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
