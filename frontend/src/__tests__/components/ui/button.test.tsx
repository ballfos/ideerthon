// @vitest-environment happy-dom
import { render, screen, cleanup } from "@testing-library/react"
import fc from "fast-check"
import "@testing-library/jest-dom/vitest"
import { describe, it, expect } from "vitest"

import { Button } from "@/components/ui/button"

describe("Button Component Property-Based Tests", () => {
    it("任意の文字列を子要素として渡してもクラッシュせずにレンダリングされること", () => {
        // fast-checkの設定。React Testing LibraryでのDOM生成はやや重いため、
        // 試行回数 (numRuns) を少し減らしてパフォーマンスを保ちます。
        fc.assert(
            fc.property(fc.string(), (randomText) => {
                try {
                    // コンポーネントをレンダリング
                    render(<Button data-testid="random-btn">{randomText}</Button>)

                    // data-testid を用いて確実にボタンを取得し、テキストが正確に描画されているか検証する
                    const buttonElement = screen.getByTestId("random-btn")
                    expect(buttonElement.textContent).toBe(randomText)
                } finally {
                    // 例外が発生した（シュリンク中など）場合も確実にクリーンアップする
                    cleanup()
                }
            }),
            { numRuns: 50 } // 50パターンのランダムな文字列（空、長文、記号入り等）でテスト
        )
    })

    it("様々なVariantとSizeの組み合わせでクラスが正しく適用されること", () => {
        // 用意されているVariantとSizeのリスト
        const variants = ["blue", "green", "red", "yellow", "wood", "ghost"] as const
        const sizes = ["default", "sm", "lg", "icon"] as const

        fc.assert(
            fc.property(
                fc.constantFrom(...variants),
                fc.constantFrom(...sizes),
                (randomVariant, randomSize) => {
                    try {
                        render(
                            <Button variant={randomVariant} size={randomSize}>
                                テスト
                            </Button>
                        )

                        const buttonElement = screen.getByText("テスト")
                        expect(buttonElement).toBeInTheDocument()

                        // 最低限の共通クラスが含まれているか検証
                        expect(buttonElement.className).toContain("inline-flex")
                        expect(buttonElement.className).toContain("items-center")
                        expect(buttonElement.className).toContain("justify-center")
                        expect(buttonElement.className).toContain("transition-all")
                    } finally {
                        cleanup()
                    }
                }
            ),
            { numRuns: 30 } // バリエーションの組み合わせをランダムに30通りテスト
        )
    })
})
