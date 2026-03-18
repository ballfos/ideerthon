import { Link } from "@tanstack/react-router";
import { Home, List, Star, MessagesSquare } from "lucide-react";
import { cn } from "#/utils/ui/cn";

export function DesktopSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-24 border-r-4 border-[#e8eed2] bg-white p-2 pt-4 font-yusei">
      <div className="flex h-full flex-col gap-6 items-center">
        {/* ナビゲーション */}
        <nav className="flex flex-col gap-4 w-full px-1">
          <SidebarItem to="/home" icon={<Home size={28} />} label="ホーム" />
          <SidebarItem to="/talks" icon={<List size={28} />} label="トーク履歴" />
          <SidebarItem to="/favorites" icon={<Star size={28} />} label="お気に入り" />

          {/* FAB代わりのボタン: コンパクトな円形/角丸ボタン */}
          <Link
            to="/talks/new"
            className="mt-6 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 p-3 text-white shadow-lg transition-all hover:brightness-110 active:translate-y-1 active:shadow-none"
            aria-label="始める!!"
          >
            <MessagesSquare size={28} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-tighter">始める!!</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}

function SidebarItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[#c2baa6] transition-all hover:bg-[#fcfaf2] hover:text-[#5a4a35]",
        "data-[active=true]:bg-[#e8eed2]/50 data-[active=true]:text-[#5a4a35] data-[active=true]:shadow-inner"
      )}
      activeProps={{
        "data-active": "true",
      }}
    >
      <div className="flex h-8 w-8 items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] font-black tracking-tighter text-center leading-tight">{label}</span>
    </Link>
  );
}
