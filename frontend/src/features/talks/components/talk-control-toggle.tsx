import { TalkStatus } from '#/gen/proto/api/v1/talk_pb';
import { talkClient } from '#/lib/api';
import { cn } from '#/utils/ui/cn';
import { Play, Square, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface TalkControlToggleProps {
    talkId: string;
    status: TalkStatus;
    className?: string;
}

export function TalkControlToggle({ className, status, talkId }: TalkControlToggleProps) {
    const [loading, setLoading] = useState(false);
    const isRunning = status === TalkStatus.RUNNING;

    const handleToggle = async () => {
        setLoading(true);
        try {
            if (isRunning) {
                await talkClient.stopTalkStream({ talkId });
            } else {
                // Start the stream. We don't need to do much with the generator here
                // as the backend handles writing to Firestore, which we observe.
                // But we must initiate the call.
                const stream = talkClient.startTalkStream({ talkId });
                // Consume the stream to keep it alive
                void (async () => {
                    try {
                        for await (const _ of stream) {
                            // Messages are saved to Firestore by backend, 
                            // which our main page is already listening to.
                        }
                    } catch (err) {
                        console.error('Stream error:', err);
                    }
                })();
            }
        } catch (err) {
            console.error('Failed to toggle talk stream:', err);
            alert('操作に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={() => { void handleToggle(); }}
            disabled={loading}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all active:scale-95 shadow-md disabled:opacity-50",
                isRunning
                    ? "bg-[#ff6b6b] text-white hover:bg-[#ff5252]"
                    : "bg-[#4b9635] text-white hover:bg-[#3d7a2b]",
                className
            )}
        >
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRunning ? (
                <Square className="h-5 w-5 fill-current" />
            ) : (
                <Play className="h-5 w-5 fill-current" />
            )}
            <span>{isRunning ? '返信を停止' : '返信を開始'}</span>
        </button>
    );
}
