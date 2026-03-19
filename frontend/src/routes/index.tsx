import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { TriangleBackground } from '@/components/ui/triangle-background'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4 font-yomogi">
      <TriangleBackground />

      <div className="z-10 flex flex-col items-center space-y-12">
        {/* Texts */}
        <div className="flex flex-col itesms-center text-center">
          {/* <p className="mb-6 rounded-full border-2 border-white bg-white/70 px-6 py-2 text-xl font-bold tracking-widest text-[#a48862] shadow-[0_2px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
            ようこそs
          </p> */}
          <h1
            className="text-5xl font-black tracking-widest text-[#7a6446] md:text-7xl"
            style={{
              textShadow: "0 4px 0 #fff, 0px -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 8px 16px rgba(0,0,0,0.15)"
            }}
          >
            あいでぃあ村
          </h1>
        </div>

        {/* Start Button */}
        <div className="mt-12">
          {/* Note: Route /home based on _layout.home.tsx context */}
          <Link to="/home" className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-[#87e968] focus-visible:ring-offset-2 rounded-full">
            <Button variant="wood" size="lg" className="px-12 py-8 text-xl shadow-lg md:text-2xl">
              はじめる
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
