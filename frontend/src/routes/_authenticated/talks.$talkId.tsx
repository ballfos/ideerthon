import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "#/lib/firebase";
import { TalkTopBar } from "#/features/talks/components/talk-top-bar";
import { MessageBubble } from "#/features/talks/components/message-bubble";
import { TalkTabs } from "#/features/talks/components/talk-tabs";
import type { TabValue } from "#/features/talks/components/talk-tabs";
import { MessageInput } from "#/features/talks/components/message-input";
import { Link } from "@tanstack/react-router";
import { useTalks } from "@/features/talks";
import { DesktopSidebar } from "#/components/ui/desktop-sidebar";
// import { TalkControlToggle } from '#/features/talks/components/talk-control-toggle'
import { TalkStatus } from "#/gen/proto/api/v1/talk_pb";
import { Plus, User, Loader2 } from "lucide-react";
import { talkClient } from "#/lib/api";

import { messageClient } from "#/lib/api";
import { useAuth } from "#/features/auth/useAuth";

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
  const [topic, setTopic] = useState<string>("読み込み中...");
  const [talkStatus, setTalkStatus] = useState<TalkStatus>(
    TalkStatus.UNSPECIFIED,
  );
  const [agents, setAgents] = useState<
    Array<{ name: string; description: string }>
  >([]);

  // エージェント追加用フォーム
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [isAddingAgent, setIsAddingAgent] = useState(false);

  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      uid: string;
      createdAt: { seconds: number; nanoseconds: number };
      isFavorite: boolean;
      agentName?: string;
    }>
  >([]);

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
      return;
    }

    const fetchTalk = async () => {
      try {
        const talkRef = doc(db, "talks", talkId);
        const talkSnap = await getDoc(talkRef);
        if (talkSnap.exists()) {
          setTopic(talkSnap.data().topic);
        } else {
          setTopic("トークが見つかりません");
        }
      } catch (err) {
        console.error("Failed to fetch talk:", err);
        setTopic("エラー");
      }
    };
    fetchTalk();
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

  const handleSend = async () => {
    if (!inputText.trim() || talkId === "none") return;
    try {
      await messageClient.sendMessage({
        talkId,
        text: inputText,
      });
      setInputText("");
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
    if (!newAgentName.trim()) return;
    setIsAddingAgent(true);
    try {
      await talkClient.addAgent({
        talkId,
        agent: {
          name: newAgentName,
          description: newAgentDesc,
        },
      });
      setNewAgentName("");
      setNewAgentDesc("");
    } catch (err) {
      console.error("Failed to add agent:", err);
      alert("エージェントの追加に失敗しました");
    } finally {
      setIsAddingAgent(false);
    }
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
                className="min-[451px]:h-20 min-[451px]:rounded-none min-[451px]:bg-transparent min-[451px]:from-transparent min-[451px]:to-transparent min-[451px]:shadow-none min-[451px]:border-b-0 shrink-0"
                titleClassName="min-[451px]:text-[#7a6446] min-[451px]:drop-shadow-none"
              />

              <div className="flex-1 flex flex-col overflow-hidden bg-white/30 backdrop-blur-sm">
                <TalkTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  className="mt-2 shrink-0 px-4"
                />

                <div className="flex-1 overflow-y-auto pb-4 scroll-smooth">
                  {activeTab === "chat" ? (
                    <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
                      {messages.map((msg) => (
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
                        />
                      ))}
                    </div>
                  ) : activeTab === "members" ? (
                    <div className="flex flex-col p-4 gap-6">
                      {/* エージェント一覧 */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-[#7a6446] flex items-center gap-2">
                          <User className="h-4 w-4" /> 現状のメンバー (
                          {agents.length})
                        </h3>
                        {agents.length === 0 ? (
                          <div className="bg-white/50 rounded-2xl p-6 text-center text-[#c2baa6] text-sm font-bold border-2 border-dashed border-[#d5cba1]">
                            メンバーがまだいません。下から追加してください！
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {agents.map((agent, i) => (
                              <div
                                key={i}
                                className="bg-white rounded-2xl p-4 border-2 border-[#d5cba1] shadow-sm flex items-start gap-3"
                              >
                                <div className="h-10 w-10 shrink-0 rounded-full bg-[#f9f1c8] border-2 border-[#d5cba1] flex items-center justify-center text-[#7a6446]">
                                  <User className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-[#7a6446] truncate">
                                    {agent.name}
                                  </p>
                                  <p className="text-xs text-[#a3967d] line-clamp-2">
                                    {agent.description}
                                  </p>
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
                            <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">
                              名前
                            </label>
                            <input
                              type="text"
                              value={newAgentName}
                              onChange={(e) => setNewAgentName(e.target.value)}
                              placeholder="エージェントの名前"
                              className="w-full bg-white rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">
                              説明/役割
                            </label>
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
                            {isAddingAgent ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Plus className="h-5 w-5" />
                            )}
                            追加する
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-[#c2baa6]">
                      <p className="font-bold">
                        「もちもの」はまだ準備中です...
                      </p>
                    </div>
                  )}
                </div>

                {activeTab === "chat" && (
                  <div className="shrink-0 p-4 min-[451px]:p-6 border-t border-[#fcfaf2] bg-white/50">
                    <div className="max-w-4xl mx-auto w-full">
                      <MessageInput
                        value={inputText}
                        onChange={setInputText}
                        onSend={handleSend}
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
