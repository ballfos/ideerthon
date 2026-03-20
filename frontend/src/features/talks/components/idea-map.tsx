import { cn } from '#/utils/ui/cn';
import * as d3 from 'd3';
import { Trash2, RefreshCcw, Sparkles, HelpCircle } from 'lucide-react';
import React, { useEffect, useRef, useState, useMemo } from 'react';

interface NodeData {
    id: string;
    label: string;
    description: string;
    embedding: number[];
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface LinkData {
    source: string | NodeData;
    target: string | NodeData;
    similarity: number;
}

interface IdeaMapProps {
    messages: {
        id: string;
        text: string;
        agentName?: string;
        ideaName?: string;
        ideas?: { name: string; details: string }[];
        embedding?: number[];
        isDiscarded?: boolean;
        isRecycled?: boolean;
    }[];
    onJumpToChat?: (messageId: string) => void;
    onDiscardIdea?: (messageId: string) => void;
    onRecycleIdea?: (messageId: string) => void;
}

const IdeaMap: React.FC<IdeaMapProps> = ({ messages, onDiscardIdea, onJumpToChat, onRecycleIdea }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
    const [isOverTrash, setIsOverTrash] = useState(false);
    const [isOverRecycle, setIsOverRecycle] = useState(false);
    const [showRecycleHelp, setShowRecycleHelp] = useState(false);

    const checkTrashHit = (x: number, y: number) => {
        const bin = document.getElementById('trash-bin');
        if (!bin) return false;
        const rect = bin.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const checkRecycleHit = (x: number, y: number) => {
        const bin = document.getElementById('recycle-bin');
        if (!bin) return false;
        const rect = bin.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    // Filter messages with embeddings
    const nodes: NodeData[] = useMemo(() => {
        return messages
            .filter(m => m.embedding && m.embedding.length > 0 && !m.isDiscarded && !m.isRecycled)
            .map(m => ({
                description: (m.ideas && m.ideas.length > 0) ? m.ideas[0].details : m.text,
                embedding: m.embedding ?? [],
                id: m.id,
                label: m.ideaName ?? m.agentName ?? "アイデア",
            }));
    }, [messages]);

    // Helper: Cosine Similarity
    const cosineSimilarity = (vecA: number[], vecB: number[]) => {
        const dotProduct = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
        const normA = vecA.reduce((sum, v) => sum + v ** 2, 0);
        const normB = vecB.reduce((sum, v) => sum + v ** 2, 0);

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const calculatedLinks: LinkData[] = useMemo(() => {
        const threshold = 0.7;
        return nodes.flatMap((nodeA, i) =>
            nodes.slice(i + 1).flatMap(nodeB => {
                const similarity = cosineSimilarity(nodeA.embedding, nodeB.embedding);
                if (similarity >= threshold) {
                    return [{
                        similarity: similarity,
                        source: nodeA.id,
                        target: nodeB.id
                    } satisfies LinkData];
                }
                return [];
            })
        );
    }, [nodes]);

    // Clustering logic
    const kCount = Math.min(6, nodes.length);
    /* eslint-disable functional/no-let */
    const clusters: number[] = useMemo(() => {
        if (nodes.length === 0 || kCount === 0) return [];
        const k = kCount;
        // Simple K-means
        let centroids = nodes.slice(0, k).map(n => [...n.embedding]);
        const assignment: number[] = new Array<number>(nodes.length).fill(-1);

        for (let iter = 0; iter < 10; iter++) {
            let changed = false;
            // E-step: assign
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                let minDist = Infinity;
                let bestK = 0;
                for (let ki = 0; ki < centroids.length; ki++) {
                    const c = centroids[ki];
                    const dist = Math.sqrt(node.embedding.reduce((sum, val, idx) => sum + Math.pow(val - c[idx], 2), 0));
                    if (dist < minDist) {
                        minDist = dist;
                        bestK = ki;
                    }
                }
                if (assignment[i] !== bestK) {
                    assignment[i] = bestK;
                    changed = true;
                }
            }

            if (!changed) break;

            // M-step: update centroids
            const dimCnt = nodes[0].embedding.length;
            const nextCentroids = Array.from({ length: k }, () => new Array<number>(dimCnt).fill(0));
            const counts = new Array<number>(k).fill(0);
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const ki = assignment[i];
                for (let idx = 0; idx < node.embedding.length; idx++) {
                    nextCentroids[ki][idx] += node.embedding[idx];
                }
                counts[ki]++;
            }
            centroids = nextCentroids.map((c, ki) => counts[ki] > 0 ? c.map(v => v / (counts[ki])) : centroids[ki]);
        }
        return assignment;
    }, [nodes, kCount]);
    /* eslint-enable functional/no-let */

    const getClusterParams = (clusterId: number) => {
        const palettes = [
            { bg: '#e8f5e9', border: '#a5d6a7', hover: '#c8e6c9', label: 'Tech Woods', text: '#2e7d32' }, // Green
            { bg: '#fffde7', border: '#fff59d', hover: '#fff9c4', label: 'Amber Plaza', text: '#f9a825' }, // Yellow
            { bg: '#f3e5f5', border: '#ce93d8', hover: '#e1bee7', label: 'Indigo Hill', text: '#7b1fa2' }, // Purple
            { bg: '#e1f5fe', border: '#81d4fa', hover: '#b3e5fc', label: 'River Side', text: '#0277bd' }, // Blue
            { bg: '#fff3e0', border: '#ffcc80', hover: '#ffe0b2', label: 'Orange Grove', text: '#ef6c00' }, // Orange
            { bg: '#f1f8e9', border: '#c5e1a5', hover: '#dcedc8', label: 'Leafy Square', text: '#558b2f' }, // Lime
        ];
        return palettes[clusterId % palettes.length] || palettes[0];
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    height: entry.contentRect.height,
                    width: entry.contentRect.width
                });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => { resizeObserver.disconnect(); };
    }, []);

    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0 || nodes.length === 0) return;

        const { height, width } = dimensions;

        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height]);

        svg.selectAll('*').remove();
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 5])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                g.attr('transform', event.transform.toString());
            });
        svg.call(zoom);

        const clusterCenters = Array.from({ length: kCount }, (_, i) => {
            const angle = (i / kCount) * 2 * Math.PI;
            const radius = Math.min(width, height) * 0.3;
            return {
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius
            };
        });

        const simulation = d3.forceSimulation<NodeData>(nodes)
            .velocityDecay(0.6)
            .force('cluster', d3.forceX<NodeData>(d => clusterCenters[clusters[nodes.indexOf(d)]]?.x ?? (width / 2)).strength(0.3))
            .force('clusterY', d3.forceY<NodeData>(d => clusterCenters[clusters[nodes.indexOf(d)]]?.y ?? (height / 2)).strength(0.3))
            .force('charge', d3.forceManyBody().strength(width < 768 ? -200 : -150))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
            .force('collision', d3.forceCollide<NodeData>().radius(width < 768 ? 50 : 65));

        const link = g.append('g')
            .selectAll<SVGLineElement, LinkData>('line')
            .data(calculatedLinks)
            .join('line')
            .attr('stroke', '#a0a0a0')
            .attr('stroke-opacity', 0)
            .attr('stroke-width', d => d.similarity * 3 + 0.5)
            .attr('class', 'transition-opacity duration-300');

        // Village Areas
        g.append('g').lower()
            .selectAll('circle')
            .data(clusterCenters)
            .join('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 160)
            .attr('fill', (_d, i) => getClusterParams(i).bg)
            .attr('opacity', 0.15)
            .attr('filter', 'blur(50px)');

        const node = g.append('g')
            .selectAll<SVGGElement, NodeData>('g')
            .data(nodes)
            .join('g')
            .attr('cursor', 'pointer')
            .call(drag(simulation));

        node.each(function (d, i) {
            const clusterId = clusters[i];
            const colors = getClusterParams(clusterId);
            const group = d3.select(this);

            const isMobile = width < 768;
            const nodeW = isMobile ? 84 : 110;
            const nodeH = isMobile ? 32 : 44;

            group.append('rect')
                .attr('width', nodeW)
                .attr('height', nodeH)
                .attr('x', -nodeW / 2)
                .attr('y', -nodeH / 2)
                .attr('rx', isMobile ? 8 : 12)
                .attr('fill', '#ffffff')
                .attr('stroke', colors.border)
                .attr('stroke-width', isMobile ? 1.5 : 2)
                .attr('class', 'drop-shadow-sm transition-all duration-300 hover:drop-shadow-md');

            group.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', colors.text)
                .attr('class', isMobile ? 'text-[9px] font-bold pointer-events-none select-none' : 'text-[11px] font-bold pointer-events-none select-none')
                .text(d.label.length > (isMobile ? 8 : 10) ? d.label.substring(0, isMobile ? 6 : 8) + '...' : d.label);
        });

        node.on('mouseover', (_event, d) => {
            link.style('stroke-opacity', l => {
                const sId = typeof l.source === 'string' ? l.source : (l.source).id;
                const tId = typeof l.target === 'string' ? l.target : (l.target).id;
                return (sId === d.id || tId === d.id) ? 0.2 : 0;
            });

            const connectedNodeIds = new Set<string>();
            connectedNodeIds.add(d.id);
            calculatedLinks.forEach(l => {
                const sId = typeof l.source === 'string' ? l.source : (l.source).id;
                const tId = typeof l.target === 'string' ? l.target : (l.target).id;
                if (sId === d.id) connectedNodeIds.add(tId);
                if (tId === d.id) connectedNodeIds.add(sId);
            });

            node.style('opacity', n => connectedNodeIds.has(n.id) ? 1 : 0.2);
        })
            .on('mouseout', () => {
                link.style('stroke-opacity', 0);
                node.style('opacity', null);
            })
            .on('click', (_event, d) => {
                setSelectedNode(d);
            });

        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as unknown as NodeData).x ?? 0)
                .attr('y1', d => (d.source as unknown as NodeData).y ?? 0)
                .attr('x2', d => (d.target as unknown as NodeData).x ?? 0)
                .attr('y2', d => (d.target as unknown as NodeData).y ?? 0);

            node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

        const getClientXY = (sourceEvent: MouseEvent | TouchEvent) => {
            if ('clientX' in sourceEvent) {
                return { x: sourceEvent.clientX, y: sourceEvent.clientY };
            }
            if ('touches' in sourceEvent && sourceEvent.touches.length > 0) {
                return { x: sourceEvent.touches[0].clientX, y: sourceEvent.touches[0].clientY };
            }
            if ('changedTouches' in sourceEvent && sourceEvent.changedTouches.length > 0) {
                return { x: sourceEvent.changedTouches[0].clientX, y: sourceEvent.changedTouches[0].clientY };
            }
            return { x: 0, y: 0 };
        };

        function drag(sim: d3.Simulation<NodeData, undefined>) {
            function dragstarted(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                if (!event.active) sim.alphaTarget(0.1).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
                const { x, y } = getClientXY(event.sourceEvent as MouseEvent | TouchEvent);
                setIsOverTrash(checkTrashHit(x, y));
                setIsOverRecycle(checkRecycleHit(x, y));
            }
            function dragended(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                if (!event.active) sim.alphaTarget(0);

                const { x, y } = getClientXY(event.sourceEvent as MouseEvent | TouchEvent);
                const overTrash = checkTrashHit(x, y);
                const overRecycle = checkRecycleHit(x, y);

                if (overTrash && onDiscardIdea) {
                    onDiscardIdea(event.subject.id);
                    setSelectedNode(null);
                } else if (overRecycle && onRecycleIdea) {
                    onRecycleIdea(event.subject.id);
                    setSelectedNode(null);
                }

                event.subject.fx = null;
                event.subject.fy = null;
                setIsOverTrash(false);
                setIsOverRecycle(false);
            }
            return d3.drag<SVGGElement, NodeData>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }

        return () => {
            simulation.stop();
        };
    }, [dimensions, nodes, calculatedLinks, clusters, kCount]);

    return (
        <div ref={containerRef} className="w-full h-full relative flex flex-row overflow-hidden font-sans bg-[#fcfaf2]/50">
            {/* Main Village Area */}
            <div className="flex-1 relative">

                <div className="absolute top-3 right-3 md:top-6 md:right-6 z-20 flex flex-row items-start gap-2 md:gap-4 pointer-events-none">
                    {/* リサイクルボックス */}
                    <div className="flex flex-col items-center gap-2 relative">
                        {/* Help Button */}
                        <button
                            className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md border border-[#d5cba1] text-[#a3967d] hover:text-[#7a6446] transition-colors pointer-events-auto z-40 opacity-60 hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowRecycleHelp(!showRecycleHelp);
                            }}
                        >
                            <HelpCircle size={14} />
                        </button>

                        {/* Help Tooltip */}
                        {showRecycleHelp && (
                            <div className="absolute top-full mt-3 right-0 w-64 bg-white/95 backdrop-blur-sm p-4 rounded-2xl border-2 border-[#ffcb05] shadow-xl z-50 pointer-events-auto">
                                <div className="flex items-start gap-2">
                                    <Sparkles className="text-[#ffcb05] flex-shrink-0" size={18} />
                                    <p className="text-[11px] font-black text-[#7a6446] leading-relaxed">
                                        リサイクルしたアイデアは自分の一覧から削除され、「リサイクルボックス」に入ることで他のユーザーに共有できるようになります。
                                    </p>
                                </div>
                                <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t-2 border-l-2 border-[#ffcb05] rotate-45" />
                            </div>
                        )}

                        <div
                            id="recycle-bin"
                            className={cn(
                                "w-16 h-16 md:w-24 md:h-24 rounded-[20px] md:rounded-[32px] border-2 md:border-4 border-dashed flex items-center justify-center transition-all duration-300",
                                isOverRecycle
                                    ? "bg-green-50 border-green-400 scale-110 shadow-2xl opacity-100"
                                    : "bg-white/40 border-[#d5cba1] opacity-40 shadow-sm"
                            )}
                        >
                            <RefreshCcw
                                size={24}
                                className={cn(
                                    "md:w-8 md:h-8 transition-all duration-300",
                                    isOverRecycle ? "text-green-500 animate-spin" : "text-[#a3967d]"
                                )}
                            />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300",
                            isOverRecycle ? "text-green-500 opacity-100" : "text-[#a3967d] opacity-60"
                        )}>
                            {isOverRecycle ? "リサイクル!!" : "リサイクル"}
                        </span>
                    </div>

                    {/* ゴミ箱 */}
                    <div className="flex flex-col items-center gap-2">
                        <div
                            id="trash-bin"
                            className={cn(
                                "w-16 h-16 md:w-24 md:h-24 rounded-[20px] md:rounded-[32px] border-2 md:border-4 border-dashed flex items-center justify-center transition-all duration-300",
                                isOverTrash
                                    ? "bg-red-50 border-red-400 scale-110 shadow-2xl opacity-100"
                                    : "bg-white/40 border-[#d5cba1] opacity-40 shadow-sm"
                            )}
                        >
                            <Trash2
                                size={24}
                                className={cn(
                                    "md:w-8 md:h-8 transition-all duration-300",
                                    isOverTrash ? "text-red-500 animate-bounce" : "text-[#a3967d]"
                                )}
                            />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300",
                            isOverTrash ? "text-red-500 opacity-100" : "text-[#a3967d] opacity-60"
                        )}>
                            {isOverTrash ? "捨てる!!" : "捨てる"}
                        </span>
                    </div>
                </div>
                {nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#c2baa6] font-bold">
                        AIとの会話が始まるとマップが作られます...
                    </div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full" />
                )}
            </div>

            {/* Sidebar / Bottom Sheet */}
            {selectedNode && (
                <div className={cn(
                    "fixed bottom-0 left-0 w-full rounded-t-[40px] border-t-8 h-[75vh] bg-white/95 backdrop-blur-xl border-[#d5cba1] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.3)] z-50 transition-all duration-500 ease-in-out",
                    "md:relative md:bottom-auto md:left-auto md:w-96 md:h-full md:rounded-none md:border-t-0 md:border-l-4 md:shadow-2xl"
                )}>
                    <div className="p-8 h-full flex flex-col relative">
                        {/* Mobile handle */}
                        <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#e8eed2] rounded-full" />

                        <button
                            onClick={() => { setSelectedNode(null); }}
                            className="self-end p-2 hover:bg-[#fcfaf2] rounded-full transition-colors mb-4 border-2 border-transparent hover:border-[#d5cba1]"
                        >
                            <svg className="w-5 h-5 text-[#a3967d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div
                            className="w-16 h-2 rounded-full mb-6"
                            style={{ backgroundColor: getClusterParams(clusters[nodes.findIndex(n => n.id === selectedNode.id)]).border }}
                        />

                        <h2 className="text-2xl font-black text-[#7a6446] mb-2 leading-tight">
                            {selectedNode.label}
                        </h2>


                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-[#5a4a35] leading-relaxed text-lg font-bold">
                                {selectedNode.description}
                            </p>


                            {onJumpToChat && (
                                <button
                                    onClick={() => { onJumpToChat(selectedNode.id); }}
                                    className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#7a6446] text-white rounded-2xl font-black text-sm hover:bg-[#5a4a35] transition-all border-b-4 border-[#3a2a15] active:translate-y-[2px] active:border-b-2 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    この発言に飛ぶ
                                </button>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {onDiscardIdea && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("このアイデアをゴミ箱に捨てますか？")) {
                                                onDiscardIdea(selectedNode.id);
                                                setSelectedNode(null);
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-[#f87171] rounded-xl font-black text-xs border-2 border-[#fee2e2] hover:bg-red-50 transition-all shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        捨てる
                                    </button>
                                )}
                                {onRecycleIdea && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("このアイデアをリサイクルボックスに入れますか？（他の人にも見えるようになります）")) {
                                                onRecycleIdea(selectedNode.id);
                                                setSelectedNode(null);
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-[#4ade80] rounded-xl font-black text-xs border-2 border-[#dcfce7] hover:bg-green-50 transition-all shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        リサイクル
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #d5cba1;
                  border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default IdeaMap;
