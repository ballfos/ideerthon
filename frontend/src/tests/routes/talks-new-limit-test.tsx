// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"

import { RouteComponent } from "@/routes/_authenticated/talks.new"

// モックを hoisted で定義
const { mockNavigate, mockSetSteps, mockUseSearch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetSteps: vi.fn(),
  mockUseSearch: vi.fn(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal() as object
  return {
    ...actual,
    createFileRoute: () => () => ({
      useNavigate: () => mockNavigate,
      useSearch: mockUseSearch,
    }),
    Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}))

vi.mock("@/lib/api", () => ({
  talkClient: {
    createTalk: vi.fn(),
  },
}))

vi.mock("@/features/guide/GuideContext", () => ({
  useGuide: () => ({ setSteps: mockSetSteps, steps: [] }),
}))

// その他の UI コンポーネントをモック
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span />, ChevronDown: () => <span />, ChevronUp: () => <span />,
  HelpCircle: () => <span />, Leaf: () => <span />, Lightbulb: () => <span />,
  Loader2: () => <span />, MessageSquare: () => <span />,
  Plus: () => <span />, Trash2: () => <span />, User: () => <span />,
}))
vi.mock("@/components/ui/page-guide", () => ({ PageGuide: () => <div /> }))
vi.mock("#/components/ui/page-guide", () => ({ PageGuide: () => <div /> }))
vi.mock("@/features/talks/components/agent-selector", () => ({
  AGENT_PRESETS: [{ description: 'desc', id: 'engineer', name: '若手エンジニア' }],
  AgentCard: () => <div />
}))

describe("TalksNew テーマ文字数検証 (100文字)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearch.mockReturnValue({ custom: "", presets: "engineer", topic: "" })
  })

  it("テーマ入力の maxLength が 100 で、カウント表示も 100 であること", () => {
    render(<RouteComponent />)
    const topicInput = screen.getByPlaceholderText(/例\) 新しいキャンプ用品/i)
    expect(topicInput).toHaveAttribute("maxLength", "100")

    fireEvent.change(topicInput, { target: { value: "テスト" } })
    expect(screen.getByText("3 / 100")).toBeInTheDocument()
  })
})
