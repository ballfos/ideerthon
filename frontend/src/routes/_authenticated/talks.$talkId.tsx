import type { TabValue } from "#/features/talks/components/talk-tabs";

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { DesktopSidebar } from "#/components/ui/desktop-sidebar";
import { PageGuide } from "#/components/ui/page-guide";
import { useAuth } from "#/features/auth/use-auth";
import { useGuide } from "#/features/guide/guide-context";
import IdeaMap from "#/features/talks/components/idea-map";
import { MessageBubble } from "#/features/talks/components/message-bubble";
import { AgentIcon } from "#/features/talks/components/agent-icons";
import { MessageInput } from "#/features/talks/components/message-input";
import { TalkControlToggle } from "#/features/talks/components/talk-control-toggle";
import { TalkTabs } from "#/features/talks/components/talk-tabs";
import { TalkTopBar } from "#/features/talks/components/talk-top-bar";
import { TalkStatus } from "#/gen/proto/api/v1/talk_pb";
import { talkClient } from "#/lib/api";
import { messageClient } from "#/lib/api";
import { db } from "#/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
} from "firebase/firestore";
import { Plus, User, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import { useTalks } from "@/features/talks";
import { AgentCard, type AgentPreset } from "@/features/talks/components/agent-selector";
import { getStampById } from "#/features/talks/constants/stamps";

export const Route = createFileRoute("/_authenticated/talks/$talkId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { talkId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading: talksLoading, talks } = useTalks();
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
    { name: string; description: string; icon?: string }[]
  >([]);
  const [newAgent, setNewAgent] = useState<AgentPreset>({
    description: "",
    id: "new",
    name: "",
  });
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<{
    index: number;
    name: string;
    description: string;
    icon?: string;
  } | null>(null);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const { setSteps } = useGuide();

  // タブごとのヘルプステップ設定
  useEffect(() => {
    const getNewSteps = () => {
      if (activeTab === 'chat') {
        return [
          {
            description: 'ここを「実行中」にすると、AIメンバーがあなたの投げかけに反応し始めます。',
            targetId: 'talk-control',
            title: 'トークの開始・停止'
          },
          {
            description: 'AIたちとの会話が表示されます。吹き出しをリプライして深掘りすることもできます！',
            targetId: 'chat-scroll-area',
            title: 'チャット画面'
          },
          {
            description: 'あなたの考えを入力して送信しましょう。AIがすぐに答えてくれます。',
            targetId: 'message-input-zone',
            title: 'メッセージ入力'
          }
        ];
      }
      if (activeTab === 'members') {
        return [
          {
            description: '現在のAIメンバーの役割を確認したり、新しい役割（エンジニア、詩人など）を村に招待したりできます。',
            targetId: 'members-list',
            title: 'メンバー管理'
          }
        ];
      }
      return [
        {
          description: '会話の中で出た「アイデア」が自動的にここにまとまります。全体像を眺めるのに最適です。',
          targetId: 'whiteboard-container',
          title: 'ホワイトボード'
        }
      ];
    };

    setSteps(getNewSteps());
    return () => { setSteps([]); };
  }, [setSteps, activeTab]);

  const [messages, setMessages] = useState<
    {
      id: string;
      text: string;
      uid: string;
      createdAt: { seconds: number; nanoseconds: number };
      isFavorite: boolean;
      isDiscarded?: boolean;
      isRecycled?: boolean;
      agentName?: string;
      ideaName?: string;
      agentIcon?: string;
      summary?: string;
      replyToMessageId?: string;
      ideas?: { name: string; details: string }[];
      embedding?: number[];
    }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastProcessedHash = useRef("");

  // オートスクロール & ハッシュジャンプ
  useEffect(() => {
    if (messages.length === 0) return;

    const hash = window.location.hash;
    // ハッシュがある場合は、その場所へのジャンプを優先する
    if (hash.startsWith("#message-")) {
      // すでにこのハッシュを処理済みの場合は何もしない
      if (hash === lastProcessedHash.current) return;
      lastProcessedHash.current = hash;

      const messageId = hash.replace("#message-", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "ring-inset",
            "ring-4",
            "md:ring-6",
            "ring-[#ffcb05]",
            "ring-opacity-30",
            "relative",
            "z-20",
            "transition-all",
            "duration-500",
          );
          setTimeout(() => {
            element.classList.remove(
              "ring-inset",
              "ring-4",
              "md:ring-6",
              "ring-[#ffcb05]",
              "ring-opacity-30",
              "relative",
              "z-20",
            );
            // ハイライトが終わったらハッシュをクリアする
            if (window.location.hash === hash) {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          }, 3000);
        }
      }, 500);
      return () => { clearTimeout(timer); };
    }

    // ハッシュがない場合のみ最下部へスクロール
    if (scrollRef.current && !hash) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, talkStatus, talkId]);

  // パソコン画面判定 (451px以上)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 451);
  useEffect(() => {
    const handleResize = () => { setIsDesktop(window.innerWidth >= 451); };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); };
  }, []);

  // talkId が "none" の場合、最新のトークがあれば遷移させる (モバイルのみ)
  // パソコンの場合は "none" のままにして空白を表示する
  useEffect(() => {
    if (talkId === "none" && !talksLoading && talks.length > 0 && !isDesktop) {
      void navigate({ params: { talkId: talks[0].id }, to: "/talks/$talkId" });
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
          setTopic((data.topic as string | undefined) ?? "");
          setTalkStatus((data.status as TalkStatus | undefined) ?? TalkStatus.STOPPED);
          setAgents((data.agents as { name: string; description: string; icon?: string }[] | undefined) ?? []);
        } else {
          setTopic("トークが見つかりません");
        }
      },
      (error) => {
        console.error("Failed to subscribe talk:", error);
        setTopic("エラー");
      },
    );

    return () => { unsubscribe(); };
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
          const favoritedBy = (data.favoritedBy ?? []) as string[];
          const isFavorite = user ? favoritedBy.includes(user.uid) : false;

          return {
            agentName: data.agentName as string | undefined,
            agentIcon: data.agentIcon as string | undefined,
            ideaName: data.ideaName as string | undefined,
            createdAt: {
              nanoseconds: createdAt.nanoseconds,
              seconds: createdAt.seconds,
            },
            embedding: data.embedding as number[] | undefined,
            id: doc.id,
            ideas: data.ideas as { name: string; details: string }[] | undefined,
            isDiscarded: !!data.isDiscarded,
            isFavorite,
            isRecycled: !!data.isRecycled,
            replyToMessageId: data.replyToMessageId as string | undefined,
            summary: data.summary as string | undefined,
            text: data.text as string,
            uid: data.uid as string,
          };
        });
        setMessages(newMessages);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
      },
    );

    return () => { unsubscribe(); };
  }, [talkId]);



  const handleStartTalk = () => {
    if (talkStatus === TalkStatus.RUNNING || talkId === "none") return;
    try {
      const stream = talkClient.startTalkStream({ talkId });
      // Consume the stream. Backend writes to Firestore; snapshots will update our UI.
      void (async () => {
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
        replyToMessageId: replyTo?.id ?? "",
        talkId,
        text: inputText,
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

  const handleSendStamp = async (stampId: string) => {
    if (talkId === "none") return;

    const stamp = getStampById(stampId);
    if (!stamp) return;

    let targetMessageId = replyTo?.id;
    if (!targetMessageId && messages.length > 0) {
      targetMessageId = messages[messages.length - 1].id;
    }

    if (!targetMessageId) return;

    try {
      await messageClient.sendMessage({
        replyToMessageId: targetMessageId,
        talkId,
        text: stamp.prompt,
      });
      setReplyTo(null);

      // 自動で返信開始
      handleStartTalk();
    } catch (err) {
      console.error("Failed to send stamp:", err);
      alert("スタンプの送信に失敗しました");
    }
  };

  const handleToggleFavorite = async (messageId: string) => {
    if (talkId === "none") return;
    try {
      await messageClient.toggleFavorite({
        messageId,
        talkId,
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
        agent: {
          description: newAgent.description,
          name: newAgent.name,
          icon: newAgent.icon || "",
        },
        talkId,
      });
      setNewAgent({ description: "", id: "new", name: "" });
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
        agentIndex: index,
        talkId,
      });
    } catch (err) {
      console.error("Failed to remove agent:", err);
      alert("削除に失敗しました");
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent?.name.trim()) return;
    setIsUpdatingAgent(true);
    try {
      await talkClient.updateAgent({
        agent: {
          description: editingAgent.description,
          name: editingAgent.name,
          icon: editingAgent.icon || "",
        },
        agentIndex: editingAgent.index,
        talkId,
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
      await messageClient.discardIdea({ messageId, talkId });
    } catch (err) {
      console.error("Failed to discard idea:", err);
    }
  };

  const handleRecycleIdea = async (messageId: string) => {
    try {
      await messageClient.recycleIdea({ messageId, talkId });
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
          "ring-inset",
          "ring-4",
          "md:ring-6",
          "ring-[#ffcb05]",
          "ring-opacity-30",
          "relative",
          "z-20",
          "rounded-2xl",
          "transition-all",
          "duration-500",
        );
        setTimeout(() => {
          element.classList.remove(
            "ring-inset",
            "ring-4",
            "md:ring-6",
            "ring-[#ffcb05]",
            "ring-opacity-30",
            "relative",
            "z-20",
          );
        }, 2000);
      }
    }, 100);
  };

  const handleDeleteTalk = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("このトークを削除しますか？（お気に入り登録されたメッセージも含め、関連するデータがすべて削除されます）")) return;
    try {
      await talkClient.deleteTalk({ talkId: id });
      if (id === talkId) {
        void navigate({ params: { talkId: "none" }, to: "/talks/$talkId" });
      }
    } catch (err) {
      console.error("Failed to delete talk:", err);
      alert("トークの削除に失敗しました");
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
              talks.map((rawTalk) => {
                const isSelected = rawTalk.id === talkId;
                const statusClasses = isSelected
                  ? "bg-[#e8eed2]/50 text-[#5a4a35] shadow-inner"
                  : "text-[#c2baa6] hover:bg-[#fcfaf2] hover:text-[#5a4a35]";
                const linkClassName = `flex w-full max-w-full items-center justify-between p-3 rounded-xl transition-all text-sm group overflow-hidden ${statusClasses}`;
                return (
                  <Link
                    key={rawTalk.id}
                    params={{ talkId: rawTalk.id }}
                    to="/talks/$talkId"
                    className={linkClassName}
                  >
                    <span className="truncate font-black tracking-tight flex-1 min-w-0 mr-2">
                      {rawTalk.topic}
                    </span>
                    <div className="flex items-center">
                      <button
                        onClick={(e) => { void handleDeleteTalk(e, rawTalk.id); }}
                        className="p-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span className="shrink-0 font-black text-lg opacity-70 group-hover:opacity-100 transition-opacity ml-1">
                        {">"}
                      </span>
                    </div>
                  </Link>
                );
              })
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
                onDelete={() => {
                  const syntheticEvent = {
                    preventDefault: () => { /* No-op for synthetic event */ },
                    stopPropagation: () => { /* No-op for synthetic event */ },
                  } as React.MouseEvent;
                  void handleDeleteTalk(syntheticEvent, talkId);
                }}
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

                <div id="chat-scroll-area" ref={scrollRef} className="flex-1 overflow-y-auto px-1 pb-4 scroll-smooth">
                  {activeTab === "chat" ? (
                    <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
                      {messages.map((msg) => {
                        const replyTarget = msg.replyToMessageId
                          ? messages.find((m) => m.id === msg.replyToMessageId)
                          : undefined;
                        return (
                          <MessageBubble
                            key={msg.id}
                            id={msg.id}
                            content={msg.ideaName ? `【${msg.ideaName}】\n${msg.text}` : msg.text}
                            isOwn={msg.uid === user?.uid}
                            timestamp={new Date(
                              msg.createdAt.seconds * 1000,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            avatar=""
                            isFavorite={msg.isFavorite}
                            onToggleFavorite={() => { void handleToggleFavorite(msg.id); }}
                            agentName={msg.agentName}
                            agentIcon={msg.agentIcon || agents.find(a => a.name === msg.agentName)?.icon}
                            replyTo={
                              replyTarget
                                ? {
                                  id: replyTarget.id,
                                  sender: replyTarget.agentName ?? "ユーザー",
                                  text: replyTarget.ideaName
                                    ? `【${replyTarget.ideaName}】 ${replyTarget.text}`
                                    : replyTarget.text,
                                }
                                : null
                            }
                            onReply={() => {
                              setReplyTo({
                                id: msg.id,
                                sender: msg.agentName ?? "ユーザー",
                                text: msg.ideaName
                                  ? `【${msg.ideaName}】 ${msg.text}`
                                  : msg.text,
                              });
                            }}
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
                              const editClasses = isEditing
                                ? "border-[#ffcb05] shadow-md ring-4 ring-[#ffcb05]/10"
                                : "border-[#d5cba1] shadow-sm";
                              const cardClassName = `bg-white rounded-2xl p-4 border-2 transition-all ${editClasses}`;
                              return (
                                <div
                                  key={`${agent.name}-${agent.description}`}
                                  className={cardClassName}
                                >
                                  {isEditing ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                         <h4 className="text-xs font-black text-[#7a6446] uppercase tracking-wider flex items-center gap-2">
                                           <div className="h-6 w-6 shrink-0 rounded-full bg-[#f9f1c8] border-2 border-[#d5cba1] flex items-center justify-center">
                                             <AgentIcon iconName={editingAgent.icon} agentName={editingAgent.name} size={14} />
                                           </div>
                                           メンバーを編集
                                         </h4>
                                        <button
                                          onClick={() => { setEditingAgent(null); }}
                                          className="text-[#a3967d] hover:text-[#7a6446]"
                                          type="button"
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
                                            onChange={(e) => {
                                              setEditingAgent({
                                                ...editingAgent,
                                                name: e.target.value,
                                              });
                                            }}
                                            className="w-full bg-[#fcfaf2] rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-[#a3967d] ml-1 uppercase">
                                            説明 / 役割
                                          </label>
                                          <textarea
                                            value={editingAgent.description}
                                            onChange={(e) => {
                                              setEditingAgent({
                                                ...editingAgent,
                                                description: e.target.value,
                                              });
                                            }}
                                            rows={2}
                                            className="w-full bg-[#fcfaf2] rounded-xl px-4 py-2 text-sm font-bold border-2 border-[#d5cba1] focus:outline-none focus:border-[#ffcb05] transition-colors resize-none"
                                          />
                                        </div>
                                        <button
                                          onClick={() => { void handleUpdateAgent(); }}
                                          disabled={
                                            isUpdatingAgent ||
                                            !editingAgent.name.trim()
                                          }
                                          className="w-full bg-[#ffcb05] text-[#7a6446] font-black py-2 rounded-xl border-b-4 border-[#e6b800] active:translate-y-[2px] active:border-b-2 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                          type="button"
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
                                        <AgentIcon iconName={agent.icon} agentName={agent.name} size={24} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="font-black text-[#7a6446] truncate">
                                            {agent.name}
                                          </p>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              onClick={() => {
                                                setEditingAgent({
                                                  description:
                                                    agent.description,
                                                  icon: agent.icon,
                                                  index: i,
                                                  name: agent.name,
                                                });
                                              }}
                                              className="p-1.5 text-[#a3967d] hover:text-[#7a6446] hover:bg-[#f9f1c8] rounded-lg transition-colors"
                                              title="編集"
                                              type="button"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                void handleRemoveAgent(i);
                                              }}
                                              className="p-1.5 text-[#a3967d] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                              title="削除"
                                              type="button"
                                            >
                                              <X className="h-3.5 w-3.5" />
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
                            onToggle={() => { setIsAddCardOpen(!isAddCardOpen); }}
                            onRemove={() => { /* Remove not implemented for new agent */ }}
                            onUpdate={(field, value) => { setNewAgent({ ...newAgent, [field]: value }); }}
                            onApplyPreset={(preset) => { setNewAgent({ ...preset, id: "new" }); }}
                            showRemove={false}
                          />

                          {isAddCardOpen && (
                            <button
                              onClick={() => { void handleAddAgent(); }}
                              disabled={isAddingAgent || !newAgent.name.trim()}
                              className="w-full bg-[#ffcb05] text-[#7a6446] font-black py-3 rounded-2xl border-b-4 border-[#e6b800] active:translate-y-[2px] active:border-b-2 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-sm"
                              type="button"
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
                  ) : (
                    <div id="whiteboard-container" className="h-full w-full overflow-hidden">
                      <IdeaMap
                        messages={messages}
                        onJumpToChat={handleJumpToChat}
                        onDiscardIdea={(id) => { void handleDiscardIdea(id); }}
                        onRecycleIdea={(id) => { void handleRecycleIdea(id); }}
                      />
                    </div>
                  )}
                </div>

                {activeTab === "chat" && (
                  <div id="message-input-zone" className="shrink-0 p-4 min-[451px]:p-6 border-t border-[#fcfaf2] bg-white/50">
                    <div className="max-w-4xl mx-auto w-full">
                      <MessageInput
                        value={inputText}
                        onChange={setInputText}
                        onSend={() => { void handleSend(); }}
                        onSendStamp={(name) => { void handleSendStamp(name); }}
                        replyInfo={replyTo}
                        onCancelReply={() => { setReplyTo(null); }}
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
