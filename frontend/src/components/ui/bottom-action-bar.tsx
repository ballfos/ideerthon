import { Link } from "@tanstack/react-router"
import { cn } from "#/utils/ui/cn"
import * as React from "react"

// TanStack Router の Link からプロパティを継承して型の恩恵を受けられるようにします
type LinkProps = React.ComponentProps<typeof Link>

export interface BottomActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
    fab?: React.ReactNode // 真ん中の中央上に浮遊するFAB
}

export function BottomActionBar({ children, className, fab, ...props }: BottomActionBarProps) {
    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-3 pointer-events-none">
            <div className="flex items-center gap-2 max-w-full">
                {/* メインのバー（丸型）: w-autoで内容に合わせ、max-widthで制限 */}
                <nav
                    className={cn(
                        "flex items-center justify-between rounded-3xl bg-white/95 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-2 border-white backdrop-blur-md pointer-events-auto",
                        className
                    )}
                    {...props}
                >
                    <div className="flex items-center gap-1 min-w-0">
                        {children}
                    </div>
                </nav>

                {/* FAB: バーの右隣に配置（画面内収まるように） */}
                {fab && (
                    <div className="pointer-events-auto shrink-0 flex h-14 w-14 lg:h-16 lg:w-16">
                        {fab}
                    </div>
                )}
            </div>
        </div>
    )
}

export interface BottomActionFABProps extends Omit<LinkProps, 'children'> {
    icon: React.ReactNode
    label?: string
}

export function BottomActionFAB({ className, icon, label, ...props }: BottomActionFABProps) {
    return (
        <Link
            {...props}
            className={cn(
                "group flex aspect-square h-full flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_8px_16px_rgba(59,130,246,0.3)] transition-all active:translate-y-[4px] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 active:scale-95",
                className
            )}
            activeProps={{
                'data-active': true,
            }}
        >
            <div className="transition-transform group-hover:scale-110 group-active:scale-95">
                {icon}
            </div>
            {label && (
                <span className="text-[10px] font-black tracking-wider text-white whitespace-nowrap">
                    {label}
                </span>
            )}
        </Link>
    )
}

export interface BottomActionBarItemProps extends Omit<LinkProps, 'children'> {
    icon: React.ReactNode
    label: string
}

export function BottomActionBarItem({ className, icon, label, ...props }: BottomActionBarItemProps) {
    return (
        <Link
            {...props}
            className={cn(
                "group flex flex-1 h-full min-w-[60px] flex-col items-center justify-center gap-0 rounded-xl transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#89c262] data-[active=true]:bg-black/10 data-[active=true]:shadow-inner px-1 py-1",
                className
            )}
            activeProps={{
                'data-active': true,
            }}
        >
            <div className="flex h-[28px] w-[28px] items-center justify-center text-[#c2baa6] transition-all duration-300 group-data-[active=true]:text-[#a3967d] group-data-[active=true]:drop-shadow-sm group-data-[active=true]:scale-110">
                {icon}
            </div>
            <span className="text-[9px] font-black tracking-tighter text-[#c2baa6] transition-colors duration-300 group-data-[active=true]:text-[#a3967d] whitespace-nowrap">
                {label}
            </span>
        </Link>
    )
}
