import * as React from "react";
import { cn } from "#/utils/ui/cn";
import { SendHorizontal } from "lucide-react";
import { Button } from "#/components/ui/button";

export interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder?: string;
    className?: string;
}

export function MessageInput({
    value,
    onChange,
    onSend,
    placeholder = "メッセージを入力...",
    className,
}: MessageInputProps) {
    const [isComposing, setIsComposing] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            // Safari workaround: keyCode 229 is the standard for IME processing
            if (isComposing || e.nativeEvent.keyCode === 229) {
                return;
            }
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className={cn("flex w-full items-end gap-2 bg-[#f9f1c8] p-4 border-t-2 border-[#d5cba1] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]", className)}>
            <div className="relative flex-1">
                <textarea
                    rows={1}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={placeholder}
                    className="w-full resize-none rounded-2xl border-2 border-[#d5cba1] bg-white px-4 py-2.5 text-sm font-bold text-[#7a6446] placeholder-[#c2baa6] focus:border-[#4b9635] focus:outline-none transition-colors"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                />
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
    );
}
