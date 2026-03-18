import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

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
    messages: Array<{
        id: string;
        text: string;
        agentName?: string;
        ideaName?: string;
        ideas?: Array<{ name: string; details: string }>;
        embedding?: number[];
    }>;
}

const IdeaMap: React.FC<IdeaMapProps> = ({ messages }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Filter messages with embeddings
    const nodes: NodeData[] = useMemo(() => {
        return messages
            .filter(m => m.embedding && m.embedding.length > 0)
            .map(m => ({
                id: m.id,
                label: m.ideaName || m.agentName || "アイデア",
                description: (m.ideas && m.ideas.length > 0) ? m.ideas[0].details : m.text,
                embedding: m.embedding!,
            }));
    }, [messages]);

    // Helper: Cosine Similarity
    const cosineSimilarity = (vecA: number[], vecB: number[]) => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] ** 2;
            normB += vecB[i] ** 2;
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const calculatedLinks = useMemo(() => {
        const threshold = 0.7;
        const links: LinkData[] = [];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const similarity = cosineSimilarity(nodes[i].embedding, nodes[j].embedding);
                if (similarity >= threshold) {
                    links.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        similarity: similarity
                    });
                }
            }
        }
        return links;
    }, [nodes]);

    // Clustering logic
    const kCount = Math.min(6, nodes.length);
    const clusters = useMemo(() => {
        if (nodes.length === 0 || kCount === 0) return [];
        const k = kCount;
        // Simple K-means
        let centroids = nodes.slice(0, k).map(n => [...n.embedding]);
        let assignment = new Array(nodes.length).fill(-1);

        for (let iter = 0; iter < 10; iter++) {
            let changed = false;
            // E-step: assign
            nodes.forEach((node, i) => {
                let minDist = Infinity;
                let bestK = 0;
                centroids.forEach((c, ki) => {
                    const dist = Math.sqrt(node.embedding.reduce((sum, val, idx) => sum + Math.pow(val - c[idx], 2), 0));
                    if (dist < minDist) {
                        minDist = dist;
                        bestK = ki;
                    }
                });
                if (assignment[i] !== bestK) {
                    assignment[i] = bestK;
                    changed = true;
                }
            });

            if (!changed) break;

            // M-step: update centroids
            const dim = nodes[0].embedding.length;
            const nextCentroids = Array.from({ length: k }, () => new Array(dim).fill(0));
            const counts = new Array(k).fill(0);
            nodes.forEach((node, i) => {
                const ki = assignment[i];
                node.embedding.forEach((val, idx) => nextCentroids[ki][idx] += val);
                counts[ki]++;
            });
            centroids = nextCentroids.map((c, ki) => counts[ki] > 0 ? c.map(v => v / counts[ki]) : centroids[ki]);
        }
        return assignment;
    }, [nodes, kCount]);

    const getClusterParams = (clusterId: number) => {
        const palettes = [
            { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32', hover: '#c8e6c9', label: 'Tech Woods' }, // Green
            { bg: '#fffde7', border: '#fff59d', text: '#f9a825', hover: '#fff9c4', label: 'Amber Plaza' }, // Yellow
            { bg: '#f3e5f5', border: '#ce93d8', text: '#7b1fa2', hover: '#e1bee7', label: 'Indigo Hill' }, // Purple
            { bg: '#e1f5fe', border: '#81d4fa', text: '#0277bd', hover: '#b3e5fc', label: 'River Side' }, // Blue
            { bg: '#fff3e0', border: '#ffcc80', text: '#ef6c00', hover: '#ffe0b2', label: 'Orange Grove' }, // Orange
            { bg: '#f1f8e9', border: '#c5e1a5', text: '#558b2f', hover: '#dcedc8', label: 'Leafy Square' }, // Lime
        ];
        return palettes[clusterId % palettes.length] || palettes[0];
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0 || nodes.length === 0) return;

        const { width, height } = dimensions;

        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height]);

        svg.selectAll('*').remove();
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
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
            .force('cluster', d3.forceX<NodeData>(d => clusterCenters[clusters[nodes.indexOf(d)]]?.x || width / 2).strength(0.3))
            .force('clusterY', d3.forceY<NodeData>(d => clusterCenters[clusters[nodes.indexOf(d)]]?.y || height / 2).strength(0.3))
            .force('charge', d3.forceManyBody().strength(-150))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
            .force('collision', d3.forceCollide<NodeData>().radius(65));

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

            group.append('rect')
                .attr('width', 110)
                .attr('height', 44)
                .attr('x', -55)
                .attr('y', -22)
                .attr('rx', 12)
                .attr('fill', '#ffffff')
                .attr('stroke', colors.border)
                .attr('stroke-width', 2)
                .attr('class', 'drop-shadow-sm transition-all duration-300 hover:drop-shadow-md');

            group.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', colors.text)
                .attr('class', 'text-[11px] font-bold pointer-events-none select-none')
                .text(d.label.length > 10 ? d.label.substring(0, 8) + '...' : d.label);
        });

        node.on('mouseover', (_event, d) => {
            link.style('stroke-opacity', l => {
                const sId = typeof l.source === 'string' ? l.source : (l.source as NodeData).id;
                const tId = typeof l.target === 'string' ? l.target : (l.target as NodeData).id;
                return (sId === d.id || tId === d.id) ? 0.2 : 0;
            });

            const connectedNodeIds = new Set<string>();
            connectedNodeIds.add(d.id);
            calculatedLinks.forEach(l => {
                const sId = typeof l.source === 'string' ? l.source : (l.source as NodeData).id;
                const tId = typeof l.target === 'string' ? l.target : (l.target as NodeData).id;
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
                .attr('x1', d => (d.source as any).x)
                .attr('y1', d => (d.source as any).y)
                .attr('x2', d => (d.target as any).x)
                .attr('y2', d => (d.target as any).y);

            node.attr('transform', d => `translate(${d.x!},${d.y!})`);
        });

        function drag(sim: d3.Simulation<NodeData, undefined>) {
            function dragstarted(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                if (!event.active) sim.alphaTarget(0.1).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            function dragended(event: d3.D3DragEvent<SVGGElement, NodeData, NodeData>) {
                if (!event.active) sim.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
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
                <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <h1 className="text-4xl font-black text-[#7a6446] tracking-tight">
                        あいでぃあ村
                    </h1>
                    <p className="text-[#a3967d] text-[10px] font-black uppercase tracking-widest mt-1 italic">Knowledge Community & Innovation Map</p>
                </div>
                {nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#c2baa6] font-bold">
                        AIとの会話が始まるとマップが作られます...
                    </div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full" />
                )}
            </div>

            {/* Sidebar */}
            {selectedNode && (
                <div className={`
                    fixed md:relative top-0 right-0 h-full bg-white/90 backdrop-blur-xl border-l-4 border-[#d5cba1] shadow-2xl transition-all duration-500 ease-in-out z-30 w-80 md:w-96
                `}>
                    <div className="p-8 h-full flex flex-col">
                        <button
                            onClick={() => setSelectedNode(null)}
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

                        <span className="text-[10px] font-black uppercase tracking-widest text-[#c2baa6] mb-8 block">
                            Village ID: {selectedNode.id}
                        </span>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-[#5a4a35] leading-relaxed text-lg font-bold">
                                {selectedNode.description}
                            </p>

                            <div className="mt-12 p-6 rounded-[24px] bg-[#f9f1c8]/50 border-2 border-[#d5cba1]">
                                <h3 className="text-[10px] font-black text-[#a3967d] uppercase tracking-widest mb-4">Innovation Vector</h3>
                                <div className="grid grid-cols-5 gap-2 opacity-60">
                                    {selectedNode.embedding.slice(0, 15).map((val, i) => (
                                        <div key={i} className="h-1 rounded-full bg-[#d5cba1]" style={{ width: `${Math.max(10, Math.min(100, Math.abs(val) * 1000))}%` }} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-[#fcfaf2] text-[10px] font-black text-[#c2baa6] italic uppercase tracking-tighter">
                            Powered by D3.js Force Simulation
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
