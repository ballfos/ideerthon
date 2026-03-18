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
    <div className="p-4 max-w-4xl mx-auto min-h-screen font-yusei">
      <div className="mb-8 font-yusei">
        <h1 className="text-2xl font-black tracking-widest text-[#5a4a35]">
          トーク履歴
        </h1>
      </div>

      {talks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[#c2baa6] text-center border-2 border-dashed border-[#e8eed2] rounded-[32px] bg-[#fcfaf2]/30">
          <p className="font-bold text-lg">トークがありません。<br />「始める!!」を押してみましょう!!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {talks.map((talk) => (
            <Link
              key={talk.id}
              // @ts-ignore
              to={`/talks/${talk.id}`}
              className="group relative flex w-full max-w-full items-center justify-between bg-white border-t-[2px] border-b-[8px] border-x-[3px] border-[#d5cba1] rounded-[24px] py-[1.2rem] px-6 shadow-sm transition-all duration-100 hover:brightness-[1.02] active:translate-y-[6px] active:border-b-[2px] active:mb-[6px] overflow-hidden"
              style={{
                boxShadow: '0 4px 0 0 #d5cba1'
              }}
            >
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-wider text-[#5a4a35] font-yusei truncate">
                  {talk.topic}
                </h2>
                <span className="text-[#8B5E3C] text-[10px] font-black mt-1 truncate">
                  {talk.updatedAt ? new Date(talk.updatedAt.toMillis()).toLocaleString('ja-JP') : '未設定'}
                </span>
              </div>
              <span className="font-black text-2xl text-[#a3967d] group-hover:translate-x-1 transition-transform ml-4">
                {'>'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
