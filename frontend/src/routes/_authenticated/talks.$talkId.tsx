import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
} from "firebase/firestore";
import { db } from "#/lib/firebase";
import { TalkTopBar } from "#/features/talks/components/talk-top-bar";
import { MessageBubble } from "#/features/talks/components/message-bubble";
import { TalkTabs } from "#/features/talks/components/talk-tabs";
import type { TabValue } from "#/features/talks/components/talk-tabs";
import { MessageInput } from "#/features/talks/components/message-input";
import { useTalks } from "@/features/talks";
import { DesktopSidebar } from "#/components/ui/desktop-sidebar";
import { TalkControlToggle } from "#/features/talks/components/talk-control-toggle";
import { TalkStatus } from "#/gen/proto/api/v1/talk_pb";
import { Plus, User, Loader2, Pencil, Trash2, X } from "lucide-react";
import { AgentCard, type AgentPreset } from "@/features/talks/components/agent-selector";
import { talkClient } from "#/lib/api";

import { messageClient } from "#/lib/api";
import { useAuth } from "#/features/auth/useAuth";
import IdeaMap from "#/features/talks/components/idea-map";
import { useGuide } from "@/features/guide/GuideContext";
import { PageGuide } from "#/components/ui/page-guide";

export const Route = createFileRoute("/_authenticated/talks/$talkId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { talkId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { talks, loading: talksLoading } = useTalks();
  const [activeTab, setActiveTab] = useState<TabValue>("chat");
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    text: string;
    sender: string;
  } | null>(null);
  const [topic, setTopic] = useState<string>("読み込み中...");
  const [talkStatus, setTalkStatus] = useState<TalkStatus>(
    TalkStatus.UNSPECIFIED,
  );
  const [agents, setAgents] = useState<
    Array<{ name: string; description: string }>
  >([]);
  const [newAgent, setNewAgent] = useState<AgentPreset>({
    id: "new",
    name: "",
    description: "",
  });
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<{
    index: number;
    name: string;
    description: string;
  } | null>(null);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const { setSteps } = useGuide();

  // タブごとのヘルプステップ設定
  useEffect(() => {
    let newSteps: any[] = [];

    if (activeTab === 'chat') {
      newSteps = [
        {
          targetId: 'talk-control',
          title: 'トークの開始・停止',
          description: 'ここを「実行中」にすると、AIメンバーがあなたの投げかけに反応し始めます。'
        },
        {
          targetId: 'chat-scroll-area',
          title: 'チャット画面',
          description: 'AIたちとの会話が表示されます。吹き出しをリプライして深掘りすることもできます！'
        },
        {
          targetId: 'message-input-zone',
          title: 'メッセージ入力',
          description: 'あなたの考えを入力して送信しましょう。AIがすぐに答えてくれます。'
        }
      ];
    } else if (activeTab === 'members') {
      newSteps = [
        {
          targetId: 'members-list',
          title: 'メンバー管理',
          description: '現在のAIメンバーの役割を確認したり、新しい役割（エンジニア、詩人など）を村に招待したりできます。'
        }
      ];
    } else if (activeTab === 'map') {
      newSteps = [
        {
          targetId: 'whiteboard-container',
          title: 'ホワイトボード',
          description: '会話の中で出た「アイデア」が自動的にここにまとまります。全体像を眺めるのに最適です。'
        }
      ];
    }

    setSteps(newSteps);
    return () => setSteps([]);
  }, [setSteps, activeTab]);

  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      uid: string;
      createdAt: { seconds: number; nanoseconds: number };
      isFavorite: boolean;
      isDiscarded?: boolean;
      isRecycled?: boolean;
      agentName?: string;
      ideaName?: string;
      replyToMessageId?: string;
      ideas?: Array<{ name: string; details: string }>;
      embedding?: number[];
    }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // オートスクロール & ハッシュジャンプ
  useEffect(() => {
    if (messages.length === 0) return;

    // ハッシュがある場合は、その場所へのジャンプを優先する
    if (window.location.hash) {
      const messageId = window.location.hash.replace("#message-", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "ring-8",
            "ring-[#ffcb05]",
            "ring-opacity-30",
            "transition-all",
            "duration-500",
          );
          setTimeout(() => {
            element.classList.remove(
              "ring-8",
              "ring-[#ffcb05]",
              "ring-opacity-30",
            );
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // ハッシュがない場合のみ最下部へスクロール
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, talkStatus, talkId]);

  // パソコン画面判定 (451px以上)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 451);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 451);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // talkId が "none" の場合、最新のトークがあれば遷移させる (モバイルのみ)
  // パソコンの場合は "none" のままにして空白を表示する
  useEffect(() => {
    if (talkId === "none" && !talksLoading && talks.length > 0 && !isDesktop) {
      navigate({ to: "/talks/$talkId", params: { talkId: talks[0].id } });
    }
  }, [talkId, talks, talksLoading, isDesktop, navigate]);

  useEffect(() => {
    if (!talkId || talkId === "none") {
      setTopic("トークを選択してください");
      setTalkStatus(TalkStatus.UNSPECIFIED);
      setAgents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "talks", talkId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTopic(data.topic || "");
          setTalkStatus((data.status as TalkStatus) || TalkStatus.STOPPED);
          setAgents(data.agents || []);
        } else {
          setTopic("トークが見つかりません");
        }
      },
      (error) => {
        console.error("Failed to subscribe talk:", error);
        setTopic("エラー");
      },
    );

    return () => unsubscribe();
  }, [talkId]);

  useEffect(() => {
    if (!talkId || talkId === "none") {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "talks", talkId, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt as Timestamp;
          const favoritedBy = (data.favoritedBy || []) as string[];
          const isFavorite = user ? favoritedBy.includes(user.uid) : false;

          return {
            id: doc.id,
            text: data.text,
            uid: data.uid,
            createdAt: {
              seconds: createdAt?.seconds || 0,
              nanoseconds: createdAt?.nanoseconds || 0,
            },
            isFavorite,
            isDiscarded: !!data.isDiscarded,
            isRecycled: !!data.isRecycled,
            agentName: data.agentName,
            ideaName: data.ideaName,
            replyToMessageId: data.replyToMessageId,
            ideas: data.ideas as Array<{ name: string; details: string }>,
            embedding: data.embedding,
          };
        });
        setMessages(newMessages);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
      },
    );

    return () => unsubscribe();
  }, [talkId]);

  // ジャンプ機能用: URLにハッシュがある場合にスクロール
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && messages.length > 0) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleStartTalk = async () => {
    if (talkStatus === TalkStatus.RUNNING || talkId === "none") return;
    try {
      const stream = talkClient.startTalkStream({ talkId });
      // Consume the stream. Backend writes to Firestore; snapshots will update our UI.
      (async () => {
        try {
          for await (const _ of stream) {
            // Stream provides data used internally by the backend
          }
        } catch (err) {
          console.error("Stream error in handleStartTalk:", err);
        }
      })();
    } catch (err) {
      console.error("Failed to start talk from handleStartTalk:", err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || talkId === "none") return;
    try {
      await messageClient.sendMessage({
        talkId,
        text: inputText,
        replyToMessageId: replyTo?.id || "",
      });
      setInputText("");
      setReplyTo(null);

      // 自動で返信開始
      handleStartTalk();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("メッセージの送信に失敗しました");
    }
  };

  const handleToggleFavorite = async (messageId: string) => {
    if (talkId === "none") return;
    try {
      await messageClient.toggleFavorite({
        talkId,
        messageId,
      });
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleAddAgent = async () => {
    if (!newAgent.name.trim()) return;
    setIsAddingAgent(true);
    try {
      await talkClient.addAgent({
        talkId,
        agent: {
          name: newAgent.name,
          description: newAgent.description,
        },
      });
      setNewAgent({ id: "new", name: "", description: "" });
      setIsAddCardOpen(false);
    } catch (err) {
      console.error("Failed to add agent:", err);
      alert("エージェントの追加に失敗しました");
    } finally {
      setIsAddingAgent(false);
    }
  };

  const handleRemoveAgent = async (index: number) => {
    if (!window.confirm("このメンバーを村から送り返しますか？")) return;
    try {
      await talkClient.removeAgent({
        talkId,
        agentIndex: index,
      });
    } catch (err) {
      console.error("Failed to remove agent:", err);
      alert("削除に失敗しました");
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent || !editingAgent.name.trim()) return;
    setIsUpdatingAgent(true);
    try {
      await talkClient.updateAgent({
        talkId,
        agentIndex: editingAgent.index,
        agent: {
          name: editingAgent.name,
          description: editingAgent.description,
        },
      });
      setEditingAgent(null);
    } catch (err) {
      console.error("Failed to update agent:", err);
      alert("更新に失敗しました");
    } finally {
      setIsUpdatingAgent(false);
    }
  };

  const handleDiscardIdea = async (messageId: string) => {
    try {
      await messageClient.discardIdea({ talkId, messageId });
    } catch (err) {
      console.error("Failed to discard idea:", err);
    }
  };

  const handleRecycleIdea = async (messageId: string) => {
    try {
      await messageClient.recycleIdea({ talkId, messageId });
    } catch (err) {
      console.error("Failed to recycle idea:", err);
    }
  };

  const handleJumpToChat = (messageId: string) => {
    setActiveTab("chat");
    // Wait for tab switch
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight effect
        element.classList.add(
          "ring-8",
          "ring-[#ffcb05]",
          "ring-opacity-30",
          "rounded-2xl",
          "transition-all",
          "duration-500",
        );
        setTimeout(() => {
          element.classList.remove("ring-8", "ring-[#ffcb05]", "ring-opacity-30");
        }, 2000);
      }
    }, 100);
  };

  return (
    <div className="flex h-screen w-screen bg-[#fcfaf2] overflow-hidden font-yusei relative">
      {/* 1. グローバルサイドバー (デスクトップ) */}
      <div className="hidden min-[451px]:block">
        <DesktopSidebar />
      </div>

      <div className="flex flex-1 overflow-hidden min-[451px]:ml-24">
        {/* 2. トーク履歴サイドバー (デスクトップ) */}
        <aside className="hidden min-[451px]:flex w-64 min-w-[160px] flex-col border-r-2 border-[#e8eed2] bg-white overflow-hidden">
          <div className="p-4 border-b border-[#fcfaf2] shrink-0">
            <h3 className="font-black text-[#5a4a35] text-sm tracking-widest px-2">
              トーク履歴
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 gap-1 flex flex-col">
            {talksLoading ? (
              <p className="p-4 text-center text-[#c2baa6] text-xs font-bold">
                読み込み中...
              </p>
            ) : (
              talks.map((rawTalk) => (
                <Link
                  key={rawTalk.id}
                  to="/talks/$talkId"
                  params={{ talkId: rawTalk.id }}
                  className={`flex w-full max-w-full items-center justify-between p-3 rounded-xl transition-all text-sm group overflow-hidden ${rawTalk.id === talkId
                    ? "bg-[#e8eed2]/50 text-[#5a4a35] shadow-inner"
                    : "text-[#c2baa6] hover:bg-[#fcfaf2] hover:text-[#5a4a35]"
                    }`}
                >
                  <span className="truncate font-black tracking-tight flex-1 min-w-0 mr-2">
                    {rawTalk.topic}
                  </span>
                  <span className="shrink-0 font-black text-lg opacity-70 group-hover:opacity-100 transition-opacity">
                    {">"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* 3. メインコンテンツエリア (ヘッダー + チャット) */}
        <div className="flex-1 min-w-[400px] shrink-0 flex flex-col overflow-hidden">
          {talkId !== "none" ? (
            <>
              <TalkTopBar
                title={topic}
                className="min-[451px]:h-20 min-[451px]:rounded-none bg-transparent from-transparent min-[451px]:to-transparent shadow-none border-b-0 shrink-0"
                titleClassName="text-[#7a6446] drop-shadow-none"
                helpGuide={<PageGuide steps={useGuide().steps} />}
              />

              <div id="talk-control" className="px-4 py-2 flex justify-center bg-[#fcfaf2]">
                <TalkControlToggle talkId={talkId} status={talkStatus} />
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-white/30 backdrop-blur-sm">
                <div id="talk-tabs">
                  <TalkTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    className="mt-2 shrink-0 px-4"
                  />
                </div>

                <div id="chat-scroll-area" ref={scrollRef} className="flex-1 overflow-y-auto pb-4 scroll-smooth">
                  {activeTab === "chat" ? (
                    <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
                      {messages.map((msg) => {
                        const replyTarget = msg.replyToMessageId
                          ? messages.find((m) => m.id === msg.replyToMessageId)
                          : null;
                        return (
                          <MessageBubble
                            key={msg.id}
                            id={msg.id}
                            content={msg.text}
                            isOwn={msg.uid === user?.uid}
                            timestamp={new Date(
                              msg.createdAt.seconds * 1000,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            avatar=""
                            isFavorite={msg.isFavorite}
                            onToggleFavorite={() => handleToggleFavorite(msg.id)}
                            agentName={msg.agentName}
                            replyTo={
                              replyTarget
                                ? {
                                  id: replyTarget.id,
                                  text: replyTarget.text,
                                  sender: replyTarget.agentName || "ユーザー",
                                }
                                : null
                            }
                            onReply={() =>
                              setReplyTo({
                                id: msg.id,
                                text: msg.text,
                                sender: msg.agentName || "ユーザー",
                              })
                            }
                          />
                        );
                      })}
                      {talkStatus === TalkStatus.RUNNING && (
                        <div className="flex items-center gap-2 p-4 text-[#a3967d] animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-black italic">誰かが考えています...🦌</span>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "members" ? (
                    <div id="members-list" className="flex flex-col p-4 gap-6">
                      {/* エージェント一覧 */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-[#7a6446] flex items-center gap-2">
                          <User className="h-5 w-5" /> 現状のメンバー (
                          {agents.length})
                        </h3>
                        {agents.length === 0 ? (
                          <div className="bg-white/50 rounded-2xl p-6 text-center text-[#c2baa6] text-sm font-bold border-2 border-dashed border-[#d5cba1]">
                            メンバーがまだいません。下から追加してください！
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {agents.map((agent, i) => {
                              const isEditing = editingAgent?.index === i;
                              return (
                                <div
                                  key={i}
                                  className={`bg-white rounded-2xl p-4 border-2 transition-all ${isEditing
                                    ? "border-[#ffcb05] shadow-md ring-4 ring-[#ffcb05]/10"
                                    : "border-[#d5cba1] shadow-sm"
                                    }`}
                                >
                                  {isEditing ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-[#7a6446] uppercase tracking-wider">
                                          メンバーを編集
                                        </h4>
                                        <button
                                          onClick={() => setEditingAgent(null)}
                                          className="text-[#a3967d] hover:text-[#7a6446]"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">
                                            名前
                                          </label>
                                          <input
                                            type="text"
                                            value={editingAgent.name}
                                            onChange={(e) =>
                                              setEditingAgent({
                                                ...editingAgent,
                                                name: e.target.value,
                                              })
                                            }
                                            className="w-full bg-[#fcfaf2] rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">
                                            説明 / 役割
                                          </label>
                                          <textarea
                                            value={editingAgent.description}
                                            onChange={(e) =>
                                              setEditingAgent({
                                                ...editingAgent,
                                                description: e.target.value,
                                              })
                                            }
                                            rows={2}
                                            className="w-full bg-[#fcfaf2] rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors resize-none"
                                          />
                                        </div>
                                        <button
                                          onClick={handleUpdateAgent}
                                          disabled={
                                            isUpdatingAgent ||
                                            !editingAgent.name.trim()
                                          }
                                          className="w-full bg-[#ffcb05] text-[#7a6446] font-black py-2 rounded-xl border-b-4 border-[#e6b800] active:translate-y-[2px] active:border-b-2 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                          {isUpdatingAgent ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            "更新を保存"
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-3">
                                      <div className="h-10 w-10 shrink-0 rounded-full bg-[#f9f1c8] border-2 border-[#d5cba1] flex items-center justify-center text-[#7a6446]">
                                        <User className="h-6 w-6" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="font-black text-[#7a6446] truncate">
                                            {agent.name}
                                          </p>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              onClick={() =>
                                                setEditingAgent({
                                                  index: i,
                                                  name: agent.name,
                                                  description:
                                                    agent.description,
                                                })
                                              }
                                              className="p-1.5 text-[#a3967d] hover:text-[#7a6446] hover:bg-[#f9f1c8] rounded-lg transition-colors"
                                              title="編集"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleRemoveAgent(i)
                                              }
                                              className="p-1.5 text-[#a3967d] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                              title="削除"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-xs text-[#a3967d] line-clamp-2 mt-0.5">
                                          {agent.description}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* エージェント追加フォーム */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-[#7a6446] flex items-center gap-2">
                          <div className="relative inline-flex items-center justify-center mr-1">
                            <User className="h-5 w-5" />
                            <Plus className="h-3.5 w-3.5 absolute -top-1 -right-1.5 stroke-[3]" />
                          </div>
                          メンバーを新しく呼ぶ
                        </h3>
                        <div className="space-y-4">
                          <AgentCard
                            agent={newAgent}
                            isOpen={isAddCardOpen}
                            onToggle={() => setIsAddCardOpen(!isAddCardOpen)}
                            onRemove={() => { }}
                            onUpdate={(field: keyof AgentPreset, value: string) =>
                              setNewAgent({ ...newAgent, [field]: value })
                            }
                            onApplyPreset={(preset: AgentPreset) =>
                              setNewAgent({ ...preset, id: "new" })
                            }
                            showRemove={false}
                          />

                          {isAddCardOpen && (
                            <button
                              onClick={handleAddAgent}
                              disabled={isAddingAgent || !newAgent.name.trim()}
                              className="w-full bg-[#ffcb05] text-[#7a6446] font-black py-3 rounded-2xl border-b-4 border-[#e6b800] active:translate-y-[2px] active:border-b-2 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-sm"
                            >
                              {isAddingAgent ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Plus className="h-5 w-5" />
                              )}
                              村へ招待する
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : activeTab === "map" ? (
                    <div id="whiteboard-container" className="h-full w-full overflow-hidden">
                      <IdeaMap
                        messages={messages}
                        onJumpToChat={handleJumpToChat}
                        onDiscardIdea={handleDiscardIdea}
                        onRecycleIdea={handleRecycleIdea}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-[#c2baa6]">
                      <p className="font-bold">
                        「メンバー」はまだ準備中です...
                      </p>
                    </div>
                  )}
                </div>

                {activeTab === "chat" && (
                  <div id="message-input-zone" className="shrink-0 p-4 min-[451px]:p-6 border-t border-[#fcfaf2] bg-white/50">
                    <div className="max-w-4xl mx-auto w-full">
                      <MessageInput
                        value={inputText}
                        onChange={setInputText}
                        onSend={handleSend}
                        replyInfo={replyTo}
                        onCancelReply={() => setReplyTo(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-sm">
              <div className="min-[451px]:h-20 shrink-0 border-b min-[451px]:border-b-0 border-[#fcfaf2]" />
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#8e8571] font-black tracking-widest text-sm font-yusei opacity-70">
                  {talksLoading
                    ? "読み込み中..."
                    : talks.length > 0
                      ? "左のリストからトークを選択してください"
                      : "トークがありません。「始める!!」を押してみましょう!!"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
