import * as React from "react";
import { cn } from "#/utils/ui/cn";

export interface HeaderProps extends React.HTMLAttributes<HTMLHeadingElement> {
  title?: string;
  titleClassName?: string;
  userAction?: React.ReactNode;
}

export function Header({
  className,
  title = "あいでぃあ村",
  titleClassName,
  userAction,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-16 w-full items-center justify-between rounded-b-2xl border-b-4 border-[#4b9635] bg-gradient-to-b from-[#87e968] to-[#6bc950] px-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
        "min-[451px]:border-b-0", // パソコン版では既存のボーダーを消す
        className,
      )}
      {...props}
    >
      {/* 草原と村の装飾（パソコン版のみ） */}
      <div className="absolute bottom-0 left-0 hidden h-5 w-full overflow-hidden min-[451px]:block pointer-events-none">
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* パターンを使用して、横幅が変わっても村が潰れないようにする */}
            <pattern id="village-pattern" x="0" y="0" width="400" height="20" patternUnits="userSpaceOnUse">
              {/* 草原の本体（1パターン分） */}
              <path
                d="M0 20V12L10 10L20 13L30 11L40 14L50 10L60 13L70 11L80 14L90 10L100 13L110 10L120 12L130 9L140 13L150 10L160 14L170 11L180 13L190 10L200 12L210 9L220 13L230 10L240 14L250 11L260 13L270 10L280 12L290 9L300 13L310 10L320 14L330 11L340 13L350 10L360 12L370 9L380 13L390 10L400 11V20H0Z"
                fill="#4b9635"
              />
              {/* 1パターン内の村の家々 */}
              <g fill="#fcfaf2">
                <g transform="translate(20, 0)">
                  <rect x="0" y="8" width="8" height="8" />
                  <path d="M-2 9L4 4L10 9H-2Z" fill="#8c662d" />
                </g>
                <g transform="translate(110, 0)">
                  <rect x="0" y="9" width="7" height="7" />
                  <path d="M-2 10L3.5 6L9 10H-2Z" fill="#c7453c" />
                </g>
                <g transform="translate(190, 0)">
                  <rect x="0" y="7" width="9" height="9" />
                  <path d="M-3 8L4.5 2L12 8H-3Z" fill="#3788af" />
                </g>
                <g transform="translate(280, 0)">
                  <rect x="0" y="9" width="8" height="7" />
                  <path d="M-2 10L4 6L10 10H-2Z" fill="#4b9635" />
                </g>
                <g transform="translate(350, 0)">
                  <rect x="0" y="8" width="8" height="9" />
                  <path d="M-2 9L4 3L10 9H-2Z" fill="#8c662d" />
                </g>
              </g>
              {/* つぶつぶの草 */}
              <g stroke="#ffffff" strokeWidth="0.5" opacity="0.4">
                <path d="M60 16L62 14L64 16" />
                <path d="M240 17L242 15L244 17" />
              </g>
            </pattern>
          </defs>
          {/* 画面端までパターンを繰り返す */}
          <rect width="100%" height="20" fill="url(#village-pattern)" />
        </svg>
      </div>

      {/* 左側の余白（中央揃えのバランスを取るため） */}
      <div className="w-10"></div>

      {/* メインタイトル */}
      <h1 className={cn(
        "text-xl font-black tracking-widest text-[#ffffff] drop-shadow-[0_2px_0_rgba(75,150,53,0.8)]",
        titleClassName
      )}>
        {title}
      </h1>

      {/* 右側のアクション（ログイン・プロフィール等） */}
      <div className="flex h-10 w-10 items-center justify-center">
        {userAction}
      </div>
    </header>
  );
}
