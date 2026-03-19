import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Header } from "#/components/ui/header";

export interface TalkTopBarProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    titleClassName?: string;
    helpGuide?: React.ReactNode;
}

export function TalkTopBar({
    className,
    title,
    titleClassName,
    helpGuide,
    ...props
}: TalkTopBarProps) {
    return (
        <Header
            title={title}
            className={className}
            titleClassName={titleClassName}
            leftAction={
                <Link
                    to="/talks"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 active:scale-95 min-[451px]:hidden"
                >
                    <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                </Link>
            }
            helpGuide={helpGuide}
            {...props}
        />
    );
}
