// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"

import { LatestTopics } from "@/components/ui/latest-topics"
import { useTalks } from "@/features/talks"

// モックの設定
vi.mock("@/features/talks", () => ({
  useTalks: vi.fn()
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}))

describe("LatestTopics Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("読み込み中の場合は『読み込み中...』が表示されること", () => {
    vi.mocked(useTalks).mockReturnValue({ error: null, loading: true, talks: [] })
    render(<LatestTopics />)
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument()
  })

  it("トーク履歴が空の場合は『履歴がまだありません』とボタンが表示されること", () => {
    vi.mocked(useTalks).mockReturnValue({ error: null, loading: false, talks: [] })
    render(<LatestTopics />)
    expect(screen.getByText(/履歴がまだありません/)).toBeInTheDocument()
    expect(screen.getByText(/トークをはじめる/)).toBeInTheDocument()
  })

  it("トーク履歴がある場合は、最新のトピック名が表示されること", () => {
    const mockTalks = [
      { id: "talk-1", topic: "テストトピック1", updatedAt: { nanoseconds: 0, seconds: 1710831600 } },
      { id: "talk-2", topic: "テストトピック2", updatedAt: { nanoseconds: 0, seconds: 1710831600 } }
    ]
    vi.mocked(useTalks).mockReturnValue({ error: null, loading: false, talks: mockTalks as unknown as import('@/features/talks').Talk[] })

    render(<LatestTopics />)

    expect(screen.getByText("テストトピック1")).toBeInTheDocument()
    expect(screen.getByText("テストトピック2")).toBeInTheDocument()
  })
})
