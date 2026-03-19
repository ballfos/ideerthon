import * as React from "react";
import { cn } from "#/utils/ui/cn";
import { Star } from "lucide-react";
import { motion, useAnimation, type PanInfo } from "framer-motion";

export interface MessageBubbleProps {
    id: string; // メッセージID
    content: string;
    isOwn?: boolean;
    avatar?: string;
    timestamp?: string;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onReply?: () => void;
    replyTo?: { id: string; text: string; sender: string } | null;
    agentName?: string;
    className?: string;
    style?: React.CSSProperties;
}

export function MessageBubble({
    className,
    id,
    content,
    isOwn = false,
    avatar,
    timestamp,
    isFavorite = false,
    onToggleFavorite,
    onReply,
    replyTo,
    agentName,
    ...props
}: MessageBubbleProps) {
    const controls = useAnimation();
    const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDragEnd = (_event: any, info: PanInfo) => {
        if (info.offset.x < -60) {
            if (onReply) onReply();
        }
        controls.start({ x: 0 });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (onReply) {
            e.preventDefault();
            onReply();
        }
    };

    const startLongPress = () => {
        const timer = setTimeout(() => {
            if (onReply) onReply();
        }, 500);
        setLongPressTimer(timer);
    };

    const endLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    return (
        <div className="relative w-full">
            {/* Tailwind Purge Prevention */}
            <div className="hidden ring-inset ring-2 ring-4 md:ring-6 ring-[#ffcb05] ring-opacity-30 ring-opacity-50 relative z-20" />

            <motion.div
                id={`message-${id}`}
                className={cn(
                    "group flex w-full items-end gap-2 px-4 py-2 scroll-mt-20", // ジャンプ時の余白
                    isOwn ? "flex-row-reverse" : "flex-row",
                    className
                )}
                drag={isMobile ? "x" : false}
                dragConstraints={{ right: 0, left: -60 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                onContextMenu={handleContextMenu}
                onTouchStart={startLongPress}
                onTouchEnd={endLongPress}
                onMouseDown={startLongPress}
                onMouseUp={endLongPress}
                onMouseLeave={endLongPress}
                {...props}
            >
                {/* アバター（他人の場合のみ表示） */}
                {!isOwn && (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#d5cba1] bg-white shadow-sm">
                        {avatar ? (
                            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-[#f9f1c8]" />
                        )}
                    </div>
                )}

                {/* メッセージ本文 */}
                <div className="flex max-w-[75%] flex-col gap-1">
                    <div
                        className={cn(
                            "relative rounded-2xl px-4 py-3 text-sm font-bold tracking-tight shadow-sm border-2",
                            isOwn
                                ? "bg-[#e2f7d5] border-[#b8e6a0] text-[#4b9635] rounded-br-none"
                                : "bg-white border-[#d5cba1] text-[#7a6446] rounded-bl-none"
                        )}
                    >
                        {agentName && (
                            <div className="mb-1 text-[10px] font-black text-[#a3967d] uppercase tracking-tighter">
                                {agentName}
                            </div>
                        )}

                        {replyTo && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const element = document.getElementById(`message-${replyTo.id}`);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        element.classList.add('ring-inset', 'ring-4', 'md:ring-6', 'ring-[#ffcb05]', 'ring-opacity-50', 'relative', 'z-20');
                                        setTimeout(() => {
                                            element.classList.remove('ring-inset', 'ring-4', 'md:ring-6', 'ring-[#ffcb05]', 'ring-opacity-50', 'relative', 'z-20');
                                        }, 2000);
                                    }
                                }}
                                className={cn(
                                    "mb-2 w-full text-left p-2 rounded-lg border-l-4 border-[#ffcb05] transition-all hover:bg-black/5",
                                    isOwn ? "bg-black/5" : "bg-[#fcfaf2]"
                                )}
                            >
                                <div className="text-[9px] font-black text-[#a3967d] uppercase tracking-tighter mb-0.5">
                                    {replyTo.sender}
                                </div>
                                <div className="text-[10px] text-[#7a6446] opacity-70 line-clamp-1 italic">
                                    {replyTo.text}
                                </div>
                            </button>
                        )}

                        {content}

                        {/* お気に入りボタン（ホバーまたはお気に入り時に表示） */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite?.();
                            }}
                            className={cn(
                                "absolute top-[-8px] transition-all active:scale-90",
                                isOwn ? "left-[-8px]" : "right-[-8px]",
                                isFavorite
                                    ? "text-[#ffcb05] scale-110 opacity-100"
                                    : "text-[#c2baa6] opacity-0 group-hover:opacity-100 hover:text-[#7a6446]"
                            )}
                        >
                            <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
                        </button>

                        {/* 吹き出しのしっぽ（角から自然に生えるように座標と回転を指定） */}
                        <div
                            className={cn(
                                "absolute bottom-[-7px] h-3 w-3 bg-inherit border-inherit",
                                isOwn
                                    ? "right-0 rotate-45 border-r-2 border-b-2"
                                    : "left-0 rotate-[-45deg] border-l-2 border-b-2"
                            )}
                        />
                    </div>

                    {/* タイムスタンプ */}
                    {timestamp && (
                        <span className={cn(
                            "text-[10px] font-medium text-[#c2baa6]",
                            isOwn ? "text-right" : "text-left"
                        )}>
                            {timestamp}
                        </span>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
