import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/talks/$talkId')({
  component: RouteComponent,
})

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '#/lib/firebase'
import { TalkTopBar } from '#/features/talks/components/talk-top-bar'
import { MessageBubble } from '#/features/talks/components/message-bubble'
import { TalkTabs } from '#/features/talks/components/talk-tabs'
import type { TabValue } from '#/features/talks/components/talk-tabs'
import { MessageInput } from '#/features/talks/components/message-input'
import { TalkControlToggle } from '#/features/talks/components/talk-control-toggle'
import { TalkStatus } from '#/gen/proto/api/v1/talk_pb'
import { doc, onSnapshot as docOnSnapshot } from 'firebase/firestore'
import { Plus, User, Loader2 } from 'lucide-react'
import { talkClient } from '#/lib/api'

import { messageClient } from '#/lib/api'
import { useAuth } from '#/features/auth/useAuth'

function RouteComponent() {
  const { talkId } = Route.useParams()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabValue>('chat')
  const [inputText, setInputText] = useState('')
  const [talkStatus, setTalkStatus] = useState<TalkStatus>(TalkStatus.UNSPECIFIED)
  const [agents, setAgents] = useState<Array<{ name: string; description: string }>>([])

  // エージェント追加用フォーム
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentDesc, setNewAgentDesc] = useState('')
  const [isAddingAgent, setIsAddingAgent] = useState(false)

  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    uid: string;
    createdAt: { seconds: number; nanoseconds: number; };
    isFavorite: boolean;
    agentName?: string;
  }>>([])

  useEffect(() => {
    if (!talkId) return

    const q = query(
      collection(db, 'talks', talkId, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt as Timestamp
        return {
          id: doc.id,
          text: data.text,
          uid: data.uid,
          createdAt: {
            seconds: createdAt?.seconds || 0,
            nanoseconds: createdAt?.nanoseconds || 0,
          },
          isFavorite: !!data.isFavorite,
          agentName: data.agentName,
        }
      })
      setMessages(newMessages)
    }, (error) => {
      console.error("Firestore onSnapshot error:", error)
    })

    return () => unsubscribe()
  }, [talkId])

  useEffect(() => {
    if (!talkId) return

    const unsubscribe = docOnSnapshot(doc(db, 'talks', talkId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        setTalkStatus(data.status as TalkStatus || TalkStatus.STOPPED)
        setAgents(data.agents || [])
      }
    })

    return () => unsubscribe()
  }, [talkId])

  // ジャンプ機能用: URLにハッシュがある場合にスクロール
  useEffect(() => {
    const hash = window.location.hash
    if (hash && messages.length > 0) {
      const id = hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim()) return
    try {
      await messageClient.sendMessage({
        talkId,
        text: inputText,
      })
      setInputText('')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('メッセージの送信に失敗しました')
    }
  }

  const handleToggleFavorite = async (messageId: string) => {
    try {
      await messageClient.toggleFavorite({
        talkId,
        messageId,
      })
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const handleAddAgent = async () => {
    if (!newAgentName.trim()) return
    setIsAddingAgent(true)
    try {
      await talkClient.addAgent({
        talkId,
        agent: {
          name: newAgentName,
          description: newAgentDesc,
        }
      })
      setNewAgentName('')
      setNewAgentDesc('')
    } catch (err) {
      console.error('Failed to add agent:', err)
      alert('エージェントの追加に失敗しました')
    } finally {
      setIsAddingAgent(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#fcfaf2]">
      {/* トップバー */}
      <div className="flex items-center justify-between">
        <TalkTopBar title={`トーク: ${talkId}`} className="flex-1" />
      </div>

      <div className="px-4 py-2 flex justify-center bg-[#fcfaf2]">
        <TalkControlToggle talkId={talkId} status={talkStatus} />
      </div>

      {/* タブ切り替え */}
      <TalkTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* メインコンテンツエリア */}
      <div className="flex-1 overflow-y-auto pb-4">
        {activeTab === 'chat' ? (
          <div className="flex flex-col py-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                id={msg.id}
                content={msg.text}
                isOwn={msg.uid === user?.uid}
                timestamp={new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                avatar=""
                isFavorite={msg.isFavorite}
                onToggleFavorite={() => handleToggleFavorite(msg.id)}
                agentName={msg.agentName}
              />
            ))}
          </div>
        ) : activeTab === 'members' ? (
          <div className="flex flex-col p-4 gap-6">
            {/* エージェント一覧 */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#7a6446] flex items-center gap-2">
                <User className="h-4 w-4" /> 現状のメンバー ({agents.length})
              </h3>
              {agents.length === 0 ? (
                <div className="bg-white/50 rounded-2xl p-6 text-center text-[#c2baa6] text-sm font-bold border-2 border-dashed border-[#d5cba1]">
                  メンバーがまだいません。下から追加してください！
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {agents.map((agent, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border-2 border-[#d5cba1] shadow-sm flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-[#f9f1c8] border-2 border-[#d5cba1] flex items-center justify-center text-[#7a6446]">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#7a6446] truncate">{agent.name}</p>
                        <p className="text-xs text-[#a3967d] line-clamp-2">{agent.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* エージェント追加フォーム */}
            <div className="bg-[#f9f1c8] rounded-[24px] p-6 border-4 border-[#d5cba1] shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#7a6446] flex items-center gap-2">
                <Plus className="h-4 w-4" /> メンバーを追加
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">名前</label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="エージェントの名前"
                    className="w-full bg-white rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">説明/役割</label>
                  <textarea
                    value={newAgentDesc}
                    onChange={(e) => setNewAgentDesc(e.target.value)}
                    placeholder="この子の性格や役割など..."
                    rows={2}
                    className="w-full bg-white rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={handleAddAgent}
                  disabled={isAddingAgent || !newAgentName.trim()}
                  className="w-full bg-[#ffcb05] text-[#7a6446] font-black py-2 rounded-xl border-b-4 border-[#e6b800] active:translate-y-[2px] active:border-b-2 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {isAddingAgent ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  追加する
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-[#c2baa6]">
            <p className="font-bold">「もちもの」はまだ準備中です...</p>
          </div>
        )}
      </div>

      {/* メッセージ入力（チャットタブの時のみ表示） */}
      {activeTab === 'chat' && (
        <MessageInput
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
        />
      )}
    </div>
  )
}
