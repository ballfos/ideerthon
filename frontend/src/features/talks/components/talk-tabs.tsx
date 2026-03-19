import { cn } from "#/utils/ui/cn";
import { MessageCircle, Network, Users } from "lucide-react";

export type TabValue = "chat" | "map" | "members";

export interface TalkTabsProps {
    activeTab: TabValue;
    onTabChange: (value: TabValue) => void;
    className?: string;
}

export function TalkTabs({ activeTab, className, onTabChange }: TalkTabsProps) {
    const tabs = [
        { icon: <MessageCircle className="h-5 w-5" />, label: "チャット", value: "chat" as const },
        { icon: <Network className="h-5 w-5" />, label: "あいでぃあ村", value: "map" as const },
        { icon: <Users className="h-5 w-5" />, label: "メンバー", value: "members" as const },
    ];

    return (
        <div className={cn("flex w-full overflow-hidden rounded-t-[24px] bg-[#fcfaf2] border-t-4 border-[#d5cba1] shadow-[0_-2px_8px_rgba(0,0,0,0.05)]", className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => { onTabChange(tab.value); }}
                    className={cn(
                        "flex flex-1 items-center justify-center gap-2 py-3 transition-all active:scale-95",
                        activeTab === tab.value
                            ? "bg-white text-[#7a6446] font-black border-b-4 border-[#ffcb05]"
                            : "text-[#c2baa6] font-bold border-b-4 border-transparent hover:text-[#a3967d]"
                    )}
                >
                    {tab.icon}
                    <span className="text-sm tracking-widest">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
