import { createFileRoute, Link } from '@tanstack/react-router'
import { useTalks } from '@/features/talks'

export const Route = createFileRoute('/_authenticated/_layout/talks')({
  component: RouteComponent,
})

function RouteComponent() {
  const { talks, loading, error } = useTalks()

  if (loading) return <div className="p-4">読み込み中...</div>
  if (error) return <div className="p-4 text-red-500">エラーが発生しました: {error.message}</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">トーク履歴</h1>
      </div>

      {talks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">トークがありません。<br />「始める!!」を押してみましょう!!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {talks.map((talk) => (
            <Link
              key={talk.id}
              // @ts-ignore
              to={`/talks/${talk.id}`}
              className="block bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-2 truncate">{talk.topic}</h2>
              <div className="text-xs text-gray-500">
                更新日: {talk.updatedAt ? new Date(talk.updatedAt.toMillis()).toLocaleString('ja-JP') : '未設定'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
