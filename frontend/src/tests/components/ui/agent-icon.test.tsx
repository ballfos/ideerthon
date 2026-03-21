// @vitest-environment happy-dom
import { render, screen, cleanup } from "@testing-library/react"
import fc from "fast-check"
import "@testing-library/jest-dom/vitest"
import { describe, it, expect } from "vitest"

import { AgentIcon, NAME_TO_ICON_MAP } from "#/features/talks/components/agent-icons"

describe("AgentIcon Component Property-Based Tests (PBT)", () => {
    it("どのような文字列（iconName, agentName）を渡してもクラッシュせずにレンダリングされること", () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.string(), fc.constant(undefined)),
                fc.oneof(fc.string(), fc.constant(undefined)),
                (randomIconName, randomAgentName) => {
                    try {
                        render(
                            <AgentIcon 
                                iconName={randomIconName} 
                                agentName={randomAgentName} 
                                data-testid="agent-icon"
                            />
                        )
                        const element = screen.getByTestId("agent-icon")
                        expect(element).toBeInTheDocument()
                    } finally {
                        cleanup()
                    }
                }
            ),
            { numRuns: 100 }
        )
    })

    it("既存のマッピングにあるエージェント名を渡したとき、正しく描画されること", () => {
        const agentNames = Object.keys(NAME_TO_ICON_MAP);
        fc.assert(
            fc.property(fc.constantFrom(...agentNames), (agentName) => {
                try {
                    render(<AgentIcon agentName={agentName} data-testid="agent-icon" />)
                    expect(screen.getByTestId("agent-icon")).toBeInTheDocument()
                } finally {
                    cleanup()
                }
            })
        )
    })

    it("絵文字を直接渡したとき、正しくspan要素として描画されること", () => {
        // 絵文字のみの文字列を生成する簡易的な方法
        const emojis = ["🦌", "🔥", "🚀", "✨", "🎉"]
        fc.assert(
            fc.property(fc.constantFrom(...emojis), (emoji) => {
                try {
                    render(<AgentIcon iconName={emoji} data-testid="agent-icon" />)
                    const element = screen.getByTestId("agent-icon")
                    expect(element.tagName).toBe("SPAN")
                    expect(element.textContent).toBe(emoji)
                } finally {
                    cleanup()
                }
            })
        )
    })
})
