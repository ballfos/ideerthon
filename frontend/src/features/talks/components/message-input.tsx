import { Button } from "#/components/ui/button";
import { cn } from "#/utils/ui/cn";
import { SendHorizontal, X, Reply, Smile } from "lucide-react";
import * as React from "react";
import { STAMPS } from "../constants/stamps";

export interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onSendStamp?: (stampId: string) => void;
    placeholder?: string;
    className?: string;
    replyInfo?: { text: string; sender: string } | null;
    onCancelReply?: () => void;
}

export function MessageInput({
    className,
    onCancelReply,
    onChange,
    onSend,
    onSendStamp,
    placeholder = "メッセージを入力...",
    replyInfo,
    value,
}: MessageInputProps) {
    const [isComposing, setIsComposing] = React.useState(false);
    const [isStampOpen, setIsStampOpen] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            // Safari workaround: keyCode 229 is the standard for IME processing
            if (isComposing) {
                return;
            }
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className={cn("flex flex-col w-full bg-[#f9f1c8] border-t-2 border-[#d5cba1] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]", className)}>
            {/* Stamp selection */}
            {isStampOpen && (
                <div className="flex flex-wrap gap-4 p-4 bg-white/80 border-b-2 border-[#d5cba1] animate-in slide-in-from-bottom-2 duration-300">
                    {STAMPS.map((stamp) => (
                        <button
                            key={stamp.id}
                            onClick={() => { onSendStamp?.(stamp.id); setIsStampOpen(false); }}
                            className="group relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-[#d5cba1] hover:border-[#ffcb05] transition-all hover:scale-105 active:scale-95 shadow-md bg-white"
                            type="button"
                        >
                            <img src={stamp.path} alt={stamp.name} className="h-full w-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-black text-white px-2 text-center">{stamp.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Reply Preview */}
            {replyInfo && (
                <div className="flex items-center justify-between px-4 py-2 bg-[#ffffff]/60 border-b border-[#d5cba1] animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Reply className="h-3 w-3 text-[#a3967d] shrink-0" />
                        <div className="overflow-hidden">
                            <span className="text-[10px] font-black text-[#a3967d] uppercase truncate block">
                                Replying to {replyInfo.sender}
                            </span>
                            <p className="text-[11px] text-[#7a6446] font-bold truncate">
                                {replyInfo.text}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 hover:bg-[#d5cba1]/30 rounded-full transition-colors"
                        type="button"
                    >
                        <X className="h-4 w-4 text-[#a3967d]" />
                    </button>
                </div>
            )}

            <div className="flex w-full items-end gap-2 p-4">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setIsStampOpen(!isStampOpen); }}
                    className={cn(
                        "h-11 w-11 shrink-0 rounded-full border-2 border-[#d5cba1] bg-white text-[#a3967d] hover:text-[#7a6446] hover:bg-[#fcfaf2]",
                        isStampOpen && "bg-[#ffcb05]/10 border-[#ffcb05] text-[#7a6446]"
                    )}
                >
                    <Smile className={cn("h-6 w-6 transition-transform", isStampOpen && "rotate-45")} />
                </Button>
                <div className="relative flex-1">
                    <textarea
                        rows={1}
                        value={value}
                        onChange={(e) => { onChange(e.target.value); }}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => { setIsComposing(true); }}
                        onCompositionEnd={() => { setIsComposing(false); }}
                        placeholder={placeholder}
                        maxLength={100}
                        className="w-full resize-none rounded-2xl border-2 border-[#d5cba1] bg-white px-4 py-2.5 text-sm font-bold text-[#7a6446] placeholder-[#c2baa6] focus:border-[#4b9635] focus:outline-none transition-colors"
                        style={{ maxHeight: "120px", minHeight: "44px" }}
                    />
                    <div className="absolute bottom-[-14px] right-2 text-[9px] font-black text-[#a3967d] opacity-50">
                        {value.length}/100
                    </div>
                </div>
                <Button
                    size="icon"
                    variant="yellow"
                    onClick={onSend}
                    disabled={!value.trim()}
                    className="h-11 w-11 shrink-0 rounded-full"
                >
                    <SendHorizontal className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
