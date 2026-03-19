import { useNavigate, useRouter } from "@tanstack/react-router";
import { User, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useAuth, signOut } from "@/features/auth";

export const UserMenu = () => {
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 外側をクリックしたときにメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setIsOpen(false);
      // ログアウト完了後、ルーターのキャッシュ更新・ログイン画面へリダイレクト
      void router.invalidate();
      void navigate({ to: "/login" });
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); }}
        className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-white/20 text-white transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white border-2 border-transparent hover:border-white/50 shadow-sm"
        aria-label="ユーザーメニューを開く"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          <User strokeWidth={3} size={24} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 mt-2 w-56 rounded-2xl border-4 border-[#d5cba1] bg-white p-2 shadow-[0_8px_0_0_#d5cba1] z-50 origin-top-right animate-in fade-in slide-in-from-top-2 zoom-in-95">
          <div className="border-b-2 border-[#f0ecd8] px-3 py-2 pb-3 mb-1">
            <p className="text-sm font-black text-[#7a6446] truncate">
              {user.displayName ?? "あいでぃあ村民"}
            </p>
            <p className="text-[10px] font-bold text-[#a09476] truncate mt-1">
              {user.email}
            </p>
          </div>
          <div>
            <button
              onClick={() => { void handleLogout(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-[#c7453c] transition-colors hover:bg-[#ff8274]/10 active:bg-[#ff8274]/20"
            >
              <LogOut strokeWidth={3} size={18} />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
