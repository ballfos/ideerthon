import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { LogIn, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { TriangleBackground } from "@/components/ui/triangle-background";
import { useAuth, signInWithGoogle } from "@/features/auth";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    return {
      redirect:
        typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
});

function RouteComponent() {
  const { loading, user } = useAuth();
  const search = Route.useSearch();
  const redirectUrl = search.redirect || "/";
  const navigate = useNavigate();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirectUrl });
    }
  }, [user, loading, navigate, redirectUrl]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setErrorMsg(null);
      await signInWithGoogle();
      router.invalidate();
    } catch (error) {
      console.error(error);
      setErrorMsg("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Waves className="h-10 w-10 animate-pulse text-[#4b9635]" />
          <p className="font-bold text-[#7a6446]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white p-4 font-sans">
      <TriangleBackground />

      <div className="z-10 flex w-[90%] max-w-sm flex-col items-center gap-8 rounded-[32px] border-4 border-transparent bg-white/90 p-8 px-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col items-center gap-2">
          {/* アプリアイコンの代わりの装飾 */}
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#e8eed2] shadow-sm">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="mt-4 text-center text-2xl font-black tracking-widest text-[#5a4a35]">
            あいでぃあ村へ
            <br />
            ようこそ！
          </h1>
          <p className="mt-2 text-center text-sm font-bold text-gray-500">
            アカウントでログインして、
            <br />
            はじめましょう。
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Button
            variant="green"
            size="lg"
            className="w-full gap-3 shadow-lg rounded-2xl py-6"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="animate-pulse">ログイン中...</span>
            ) : (
              <>
                <LogIn strokeWidth={3} className="h-5 w-5" />
                <span className="font-bold tracking-wider">Googleでログイン</span>
              </>
            )}
          </Button>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-bold text-red-600">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="mt-2 text-center text-xs font-bold text-gray-400">
          <p>
            ログインすることで、利用規約と
            <br />
            プライバシーポリシーに同意した
            <br />
            ものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
}
