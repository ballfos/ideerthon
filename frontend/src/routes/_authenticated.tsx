import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/features/auth";
import { motion } from "motion/react";
import { GuideProvider } from "@/features/guide/GuideContext";

// 角丸の正三角形（おにぎり型）をSVGポリゴンで描画するコンポーネント
function RoundedEquilateralTriangle({
  cx,
  cy,
  sideLength,
  fill,
  rotation,
}: {
  cx: number
  cy: number
  sideLength: number
  fill: string
  rotation: number
}) {
  const R = sideLength / Math.sqrt(3);
  const points = `0,${-R} ${sideLength / 2},${R / 2} ${-sideLength / 2},${R / 2}`;

  return (
    <polygon
      points={points}
      fill={fill}
      stroke={fill}
      strokeWidth={sideLength * 0.25}
      strokeLinejoin="round"
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={0.6}
    />
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // onAuthStateChangedなどを利用して確実に認証状態を取得する
    const user = await getCurrentUser();

    if (!user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // 取得したユーザー情報をcontextとして下層に流すことも可能
    return { user };
  },
  pendingComponent: () => (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white p-4 font-sans">
      {/* 動的生成の角丸の巨大な正三角形（おにぎり型）背景 */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <RoundedEquilateralTriangle cx={15} cy={20} sideLength={15} fill="#2dd4bf" rotation={15} />
          <RoundedEquilateralTriangle cx={25} cy={30} sideLength={25} fill="#a3e635" rotation={-20} />
          <RoundedEquilateralTriangle cx={85} cy={15} sideLength={18} fill="#14b8a6" rotation={45} />
          <RoundedEquilateralTriangle cx={10} cy={80} sideLength={22} fill="#a3e635" rotation={-15} />
          <RoundedEquilateralTriangle cx={75} cy={75} sideLength={30} fill="#14b8a6" rotation={-35} />
          <RoundedEquilateralTriangle cx={85} cy={85} sideLength={20} fill="#84cc16" rotation={10} />
        </svg>
      </div>

      <div className="z-10 flex flex-col items-center justify-center gap-4 rounded-3xl border-4 border-transparent bg-white/70 p-8 shadow-lg backdrop-blur-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8eed2] shadow-sm">
          <motion.span
            className="text-3xl"
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
          >
            🌱
          </motion.span>
        </div>
        <p className="font-bold tracking-widest text-[#5a4a35]">読み込み中...</p>
      </div>
    </div>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <GuideProvider>
      <Outlet />
    </GuideProvider>
  );
}
