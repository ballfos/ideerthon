import * as React from "react";
import { cn } from "#/utils/ui/cn";
import { Star } from "lucide-react";

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string; // メッセージID
    content: string;
    isOwn?: boolean;
    avatar?: string;
    timestamp?: string;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    agentName?: string;
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
    agentName,
    ...props
}: MessageBubbleProps) {
    return (
        <div
            id={`message-${id}`}
            className={cn(
                "group flex w-full items-end gap-2 px-4 py-2 scroll-mt-20", // ジャンプ時の余白
                isOwn ? "flex-row-reverse" : "flex-row",
                className
            )}
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
                    {content}

                    {/* お気に入りボタン（ホバーまたはお気に入り時に表示） */}
                    <button
                        onClick={onToggleFavorite}
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

                    {/* 吹き出しのしっぽ（簡易版） */}
                    <div
                        className={cn(
                            "absolute bottom-[-2px] h-3 w-3 border-b-2 border-r-2",
                            isOwn
                                ? "right-[-7px] rotate-45 border-[#b8e6a0] bg-[#e2f7d5]"
                                : "left-[-7px] rotate-[225deg] border-[#d5cba1] bg-white"
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
        </div>
    );
}
