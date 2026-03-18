import * as React from "react";
import { cn } from "#/utils/ui/cn";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface TalkTopBarProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
}

export function TalkTopBar({
    className,
    title,
    ...props
}: TalkTopBarProps) {
    return (
        <header
            className={cn(
                "sticky top-0 z-50 flex h-16 w-full items-center justify-between rounded-b-2xl border-b-4 border-[#4b9635] bg-gradient-to-b from-[#87e968] to-[#6bc950] px-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                className,
            )}
            {...props}
        >
            {/* 戻るボタン */}
            <Link
                to="/talks"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 active:scale-95"
            >
                <ArrowLeft className="h-6 w-6" strokeWidth={3} />
            </Link>

            {/* センタータイトル */}
            <h1 className="flex-1 px-4 text-center text-lg font-black tracking-widest text-[#ffffff] drop-shadow-[0_2px_0_rgba(75,150,53,0.8)] truncate">
                {title}
            </h1>

            {/* 右側のスペース（バランス用） */}
            <div className="w-10"></div>
        </header>
    );
}
