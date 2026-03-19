import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BottomActionBar,
  BottomActionBarItem,
  BottomActionFAB,
} from "#/components/ui/bottom-action-bar";
import { DesktopSidebar } from "#/components/ui/desktop-sidebar";
import { Header } from "#/components/ui/header";
import { PageGuide } from "#/components/ui/page-guide";
import { useGuide } from "#/features/guide/guide-context";
import { Home, List, MessagesSquare, Star, RefreshCcw } from "lucide-react";

import { UserMenu } from "@/features/auth";

export const Route = createFileRoute("/_authenticated/_layout")({
  component: RouteComponent,
});

function RouteComponent() {
  const { steps } = useGuide();

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-white font-sans"
      style={{
        backgroundImage: "radial-gradient(#00000012 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* デスクトップ用サイドバー: 451px以上で表示 */}
      <div className="hidden min-[451px]:block">
        <DesktopSidebar />
      </div>

      <div className="flex flex-1 flex-col min-[451px]:pl-24">
        <Header
          className="rounded-none border-b-2 bg-white from-transparent to-transparent shadow-none"
          titleClassName="text-[#5a4a35] drop-shadow-none"
          userAction={<UserMenu />}
          helpGuide={steps.length > 0 ? <PageGuide steps={steps} /> : null}
        />

        {/* メインコンテンツエリア */}
        <main className="flex-1 overflow-y-auto pb-[160px] min-[451px]:pb-8">
          <div className="mx-auto max-w-screen-lg p-4 min-[451px]:p-8">
            <Outlet />
          </div>
        </main>

        {/* モバイル用ボトムバー: 450px以下で表示 */}
        <div className="min-[451px]:hidden">
          <BottomActionBar
            fab={
              <BottomActionFAB
                to="/talks/new"
                icon={<MessagesSquare size={24} strokeWidth={3} />}
                label="始める!!"
                aria-label="新しいトークを作成"
              />
            }
          >
            <BottomActionBarItem
              to="/home"
              icon={<Home size={24} strokeWidth={2.5} />}
              label="ホーム"
            />
            <BottomActionBarItem
              to="/talks"
              icon={<List size={24} strokeWidth={2.5} />}
              label="トーク履歴"
            />
            <BottomActionBarItem
              // @ts-ignore
              to="/favorites"
              icon={<Star size={24} strokeWidth={2.5} />}
              label="お気に入り"
            />
            <BottomActionBarItem
              to="/recycle"
              icon={<RefreshCcw size={24} strokeWidth={2.5} />}
              label="リサイクル"
            />
          </BottomActionBar>
        </div>
      </div>
    </div>
  );
}
