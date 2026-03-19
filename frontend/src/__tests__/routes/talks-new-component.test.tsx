// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import "@testing-library/jest-dom/vitest"

import { AgentCard } from "@/features/talks/components/agent-selector"

// 最小限のモック
vi.mock("lucide-react", () => ({
  ChevronDown: () => <span />,
  ChevronUp: () => <span />,
  Trash2: () => <span />,
  User: () => <span />,
}))

describe("AgentCard バリデーションテスト", () => {
  const mockAgent = {
    description: 'テスト用の役割説明です。',
    id: 'test-agent',
    name: 'テストエージェント'
  }

  it("名前と役割に正しい maxLength が設定されていること", () => {
    // isOpen=true でレンダリングして入力を表示させる
    render(
      <AgentCard 
        agent={mockAgent} 
        isOpen={true} 
        onToggle={vi.fn()} 
        onUpdate={vi.fn()} 
        onApplyPreset={vi.fn()} 
        onRemove={vi.fn()} 
      />
    )

    const nameInput = screen.getByDisplayValue(mockAgent.name)
    const descInput = screen.getByDisplayValue(mockAgent.description)

    expect(nameInput).toHaveAttribute("maxLength", "15")
    expect(descInput).toHaveAttribute("maxLength", "100")
  })

  it("名前と役割の文字数カウントが正しく表示されること", () => {
    render(
      <AgentCard 
        agent={mockAgent} 
        isOpen={true} 
        onToggle={vi.fn()} 
        onUpdate={vi.fn()} 
        onApplyPreset={vi.fn()} 
        onRemove={vi.fn()} 
      />
    )

    // 「テストエージェント」は9文字
    expect(screen.getByText("9 / 15")).toBeInTheDocument()
    // 「テスト用の役割説明です。」は12文字
    expect(screen.getByText("12 / 100")).toBeInTheDocument()
  })
})
