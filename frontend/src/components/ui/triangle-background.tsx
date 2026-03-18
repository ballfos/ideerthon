// 角丸の正三角形（おにぎり型）をSVGポリゴンで描画するコンポーネント
// strokeLinejoin="round" と strokeWidth を用いて角の丸みを表現しています
function RoundedEquilateralTriangle({
    cx,
    cy,
    sideLength,
    fill,
    rotation,
}: {
    cx: number
    cy: number
    sideLength: number
    fill: string
    rotation: number
}) {
    // 正三角形の重心から頂点までの距離 R
    const R = sideLength / Math.sqrt(3)
    // 相対的な3頂点の座標
    const points = `0,${-R} ${sideLength / 2},${R / 2} ${-sideLength / 2},${R / 2}`

    return (
        <polygon
            points={points}
            fill={fill}
            stroke={fill}
            strokeWidth={sideLength * 0.25} // 丸みの強さ（一回り大きくなります）
            strokeLinejoin="round"
            transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
            opacity={0.6}
        />
    )
}

export function TriangleBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 z-0">
            <svg
                className="h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid slice"
            >
                {/* 左上のペア: 青緑と黄緑が重なり合う */}
                <RoundedEquilateralTriangle
                    cx={15}
                    cy={20}
                    sideLength={15}
                    fill="#2dd4bf"
                    rotation={15}
                />
                <RoundedEquilateralTriangle
                    cx={25}
                    cy={30}
                    sideLength={25}
                    fill="#a3e635"
                    rotation={-20}
                />

                {/* 右上の孤立したもの */}
                <RoundedEquilateralTriangle
                    cx={85}
                    cy={15}
                    sideLength={18}
                    fill="#14b8a6"
                    rotation={45}
                />

                {/* 左下の孤立したもの */}
                <RoundedEquilateralTriangle
                    cx={10}
                    cy={80}
                    sideLength={22}
                    fill="#a3e635"
                    rotation={-15}
                />

                {/* 右下のペア: サイズを少し変えて重なり合う */}
                <RoundedEquilateralTriangle
                    cx={75}
                    cy={75}
                    sideLength={30}
                    fill="#14b8a6"
                    rotation={-35}
                />
                <RoundedEquilateralTriangle
                    cx={85}
                    cy={85}
                    sideLength={20}
                    fill="#84cc16"
                    rotation={10}
                />
            </svg>
        </div>
    )
}
