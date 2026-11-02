import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Member, Relationship, ViewMode, CanvasMode, LayerFilter } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Link2,
  Eye,
  Edit3,
  MousePointer,
  Layers,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';

interface NetworkCanvasProps {
  members: Member[];
  relationships: Relationship[];
  centerMemberId: string;
  selectedMemberId: string | null;
  viewMode: ViewMode;
  canvasMode: CanvasMode;
  onChangeCanvasMode: (mode: CanvasMode) => void;
  maxLayers: LayerFilter;
  onChangeMaxLayers: (layers: LayerFilter) => void;
  selectedGroupFilter: string;
  onChangeGroupFilter: (group: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  allGroups: string[];
  onSelectMember: (memberId: string) => void;
  onDoubleClickMember: (member: Member) => void;
  onOpenDrawer?: () => void;
  onSelectRelationship?: (relationshipId: string) => void;
  onRequestConnect: (sourceId: string, targetId: string) => void;
  onSeverRelationship: (relationshipId: string) => void;
  onSetAsCenter: (memberId: string) => void;
}

interface PhysicsNode {
  id: string;
  member: Member;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number; // BFS distance from center
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  members,
  relationships,
  centerMemberId,
  selectedMemberId,
  viewMode,
  canvasMode,
  onChangeCanvasMode,
  maxLayers,
  onChangeMaxLayers,
  selectedGroupFilter,
  onChangeGroupFilter,
  searchQuery,
  onChangeSearchQuery,
  allGroups,
  onSelectMember,
  onDoubleClickMember,
  onOpenDrawer,
  onRequestConnect,
  onSeverRelationship,
  onSetAsCenter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transformation: Pan and Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isConnectingMode, setIsConnectingMode] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectingTargetPos, setConnectingTargetPos] = useState<{ x: number; y: number } | null>(null);

  // Selected link for quick action popup in Edit Mode
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);

  // Simulation physics cooling controller (prevents drifting)
  const alphaRef = useRef<number>(1.0);
  const nodesRef = useRef<Map<string, PhysicsNode>>(new Map());
  const isDraggingNodeRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Double click tracking
  const lastClickRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const reheatSimulation = useCallback((intensity = 0.8) => {
    alphaRef.current = Math.max(alphaRef.current, intensity);
  }, []);

  // Calculate degrees of separation via BFS from centerMemberId
  const degreesMap = useMemo((): Map<string, number> => {
    const degrees = new Map<string, number>();
    degrees.set(centerMemberId, 0);

    const adj = new Map<string, string[]>();
    members.forEach((m) => adj.set(m.id, []));
    relationships.forEach((r) => {
      adj.get(r.sourceId)?.push(r.targetId);
      adj.get(r.targetId)?.push(r.sourceId);
    });

    const queue: [string, number][] = [[centerMemberId, 0]];
    const visited = new Set<string>([centerMemberId]);

    while (queue.length > 0) {
      const [currId, d] = queue.shift()!;
      degrees.set(currId, d);
      const neighbors = adj.get(currId) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([n, d + 1]);
        }
      }
    }

    members.forEach((m) => {
      if (!degrees.has(m.id)) degrees.set(m.id, 99);
    });

    return degrees;
  }, [members, relationships, centerMemberId]);

  // Determine Visible Members by SIMULTANEOUSLY applying Layer + Group + Search filters
  const visibleMembers = useMemo(() => {
    return members.filter((m) => {
      const isCenter = m.id === centerMemberId;
      const d = degreesMap.get(m.id) ?? 99;

      // 1. Layer filter
      if (maxLayers !== 'all') {
        if (d > maxLayers && !isCenter) return false;
      }

      // 2. Group / Category filter
      if (selectedGroupFilter !== 'all') {
        if (m.group !== selectedGroupFilter && !isCenter) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchNickname = m.nickname?.toLowerCase().includes(q);
        const matchGroup = m.group.toLowerCase().includes(q);
        const matchNotes = m.notes?.toLowerCase().includes(q);
        const matchFields = m.customFields.some(
          (f) => f.name.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)
        );
        if (!matchName && !matchNickname && !matchGroup && !matchNotes && !matchFields) {
          return false;
        }
      }

      return true;
    });
  }, [members, degreesMap, centerMemberId, maxLayers, selectedGroupFilter, searchQuery]);

  const visibleMemberIds = useMemo(() => {
    return new Set<string>(visibleMembers.map((m) => m.id));
  }, [visibleMembers]);

  // Visible relationships (both endpoints must be visible)
  const visibleRelationships = useMemo(() => {
    return relationships.filter(
      (r) => visibleMemberIds.has(r.sourceId) && visibleMemberIds.has(r.targetId)
    );
  }, [relationships, visibleMemberIds]);

  // Synchronize visible members into physics nodes
  useEffect(() => {
    const existing = nodesRef.current;
    const nextMap = new Map<string, PhysicsNode>();

    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;

    visibleMembers.forEach((m, idx) => {
      const d = degreesMap.get(m.id) ?? 2;
      const isCenter = m.id === centerMemberId;
      const radius = isCenter ? 36 : Math.max(22, 32 - Math.min(3, d) * 3);

      if (existing.has(m.id)) {
        const prev = existing.get(m.id)!;
        nextMap.set(m.id, {
          ...prev,
          member: m,
          radius,
          degree: d,
        });
      } else {
        const angle = (idx / Math.max(1, visibleMembers.length)) * Math.PI * 2;
        const dist = isCenter ? 0 : 120 + Math.min(3, d) * 90 + (idx % 3) * 20;
        nextMap.set(m.id, {
          id: m.id,
          member: m,
          x: width / 2 + Math.cos(angle) * dist,
          y: height / 2 + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius,
          degree: d,
        });
      }
    });

    nodesRef.current = nextMap;
    reheatSimulation(0.85);
  }, [visibleMembers, degreesMap, centerMemberId, reheatSimulation]);

  // Trigger reheat when switching view modes or layers
  useEffect(() => {
    reheatSimulation(1.0);
  }, [viewMode, maxLayers, reheatSimulation]);

  // Screen -> World coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        x: (sx - transform.x) / transform.scale,
        y: (sy - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // Center view on canvas
  const handleResetView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const centerNode = nodesRef.current.get(centerMemberId);
    if (centerNode) {
      setTransform({
        x: w / 2 - centerNode.x,
        y: h / 2 - centerNode.y,
        scale: 1,
      });
    } else {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [centerMemberId]);

  useEffect(() => {
    handleResetView();
  }, [handleResetView]);

  // Main Canvas render & animation loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background clearing
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid dots
      ctx.save();
      ctx.translate(transform.x % 40, transform.y % 40);
      ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
      const step = 40 * transform.scale;
      if (step > 15) {
        for (let x = -40; x < width + 40; x += step) {
          for (let y = -40; y < height + 40; y += step) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // Apply camera transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      const nodes = Array.from(nodesRef.current.values());
      const nodeMap = nodesRef.current;
      const centerNode = nodeMap.get(centerMemberId);
      const cx = centerNode ? centerNode.x : width / 2;
      const cy = centerNode ? centerNode.y : height / 2;

      // =================================================================
      // 1. PHYSICS UPDATE WITH STABILITY COOLING (完全無漂移)
      // =================================================================
      const alpha = alphaRef.current;

      if (viewMode === 'force') {
        if (alpha > 0.003 || isDraggingNodeRef.current) {
          // Node repulsion
          for (let i = 0; i < nodes.length; i++) {
            const n1 = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
              const n2 = nodes[j];
              const dx = n2.x - n1.x;
              const dy = n2.y - n1.y;
              const distSq = dx * dx + dy * dy || 1;
              const dist = Math.sqrt(distSq);
              const minDist = n1.radius + n2.radius + 35;
              if (dist < 360) {
                const force = ((minDist * minDist * 140) / distSq) * alpha;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                if (isDraggingNodeRef.current !== n1.id) {
                  n1.vx -= fx * 0.005;
                  n1.vy -= fy * 0.005;
                }
                if (isDraggingNodeRef.current !== n2.id) {
                  n2.vx += fx * 0.005;
                  n2.vy += fy * 0.005;
                }
              }
            }

            // Gentle gravity centering
            if (alpha > 0.05 && n1.id !== centerMemberId && isDraggingNodeRef.current !== n1.id) {
              const gdx = cx - n1.x;
              const gdy = cy - n1.y;
              const gDist = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
              const gForce = 0.015 * gDist * alpha;
              n1.vx += (gdx / gDist) * gForce;
              n1.vy += (gdy / gDist) * gForce;
            }
          }

          // Hooke's spring law along visible edges (neighbors follow smoothly)
          visibleRelationships.forEach((rel) => {
            const s = nodeMap.get(rel.sourceId);
            const t = nodeMap.get(rel.targetId);
            if (!s || !t) return;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 240 - rel.strength * 22;
            const springK = (0.04 + rel.strength * 0.01) * Math.max(alpha, 0.35);
            const force = (dist - targetDist) * springK;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (isDraggingNodeRef.current !== s.id && s.id !== centerMemberId) {
              s.vx += fx;
              s.vy += fy;
            }
            if (isDraggingNodeRef.current !== t.id && t.id !== centerMemberId) {
              t.vx -= fx;
              t.vy -= fy;
            }
          });

          // Velocity damping & integration
          nodes.forEach((n) => {
            if (isDraggingNodeRef.current === n.id) {
              n.vx = 0;
              n.vy = 0;
              return;
            }
            n.vx *= 0.72;
            n.vy *= 0.72;
            n.x += n.vx;
            n.y += n.vy;
          });

          if (!isDraggingNodeRef.current) {
            alphaRef.current *= 0.95;
          }
        } else {
          nodes.forEach((n) => {
            n.vx = 0;
            n.vy = 0;
          });
        }
      } else {
        // ==========================================
        // RADAR CONCENTRIC VIEW (依層數顯示圓環)
        // ==========================================
        const allRings = [
          { degree: 1, r: 140, label: '一度圈 (直系親友/核心夥伴)' },
          { degree: 2, r: 260, label: '二度圈 (業務合作/引薦關係)' },
          { degree: 3, r: 380, label: '三度及外圍圈' },
        ];

        const ringsToShow = allRings.filter((ring) => {
          if (maxLayers === 'all') return true;
          return ring.degree <= maxLayers;
        });

        ringsToShow.forEach((ring) => {
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.font = '11px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(ring.label, cx + 15, cy - ring.r + 14);
        });

        // Interpolate visible nodes onto their orbital rings
        if (alpha > 0.005 || isDraggingNodeRef.current) {
          const groupedByDegree = new Map<number, PhysicsNode[]>();
          nodes.forEach((n) => {
            const list = groupedByDegree.get(n.degree) || [];
            list.push(n);
            groupedByDegree.set(n.degree, list);
          });

          groupedByDegree.forEach((degreeNodes, d) => {
            if (d === 0) {
              const center = degreeNodes[0];
              if (center && isDraggingNodeRef.current !== center.id) {
                center.x += (cx - center.x) * 0.15;
                center.y += (cy - center.y) * 0.15;
              }
              return;
            }

            const ringRadius = d === 1 ? 140 : d === 2 ? 260 : 380;
            const count = degreeNodes.length;
            degreeNodes.forEach((n, idx) => {
              if (isDraggingNodeRef.current === n.id) return;
              const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
              const targetX = cx + Math.cos(angle) * ringRadius;
              const targetY = cy + Math.sin(angle) * ringRadius;
              n.x += (targetX - n.x) * 0.15;
              n.y += (targetY - n.y) * 0.15;
            });
          });

          if (!isDraggingNodeRef.current) {
            alphaRef.current *= 0.94;
          }
        }
      }

      // ==========================================
      // 2. DRAW EDGES / RELATIONSHIPS
      // ==========================================
      visibleRelationships.forEach((rel) => {
        const s = nodeMap.get(rel.sourceId);
        const t = nodeMap.get(rel.targetId);
        if (!s || !t) return;

        const isHighlighted =
          s.id === selectedMemberId ||
          t.id === selectedMemberId ||
          s.id === hoveredNodeIdRef.current ||
          t.id === hoveredNodeIdRef.current ||
          rel.id === activeEdgeId;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        let strokeColor = 'rgba(100, 116, 139, 0.35)';
        if (rel.category === '親友') strokeColor = 'rgba(236, 72, 153, 0.6)';
        else if (rel.category === '職場') strokeColor = 'rgba(139, 92, 246, 0.6)';
        else if (rel.category === '商務合作') strokeColor = 'rgba(245, 158, 11, 0.6)';
        else if (rel.category === '學校學緣') strokeColor = 'rgba(59, 130, 246, 0.6)';
        else if (rel.category === '社交') strokeColor = 'rgba(16, 185, 129, 0.6)';

        if (isHighlighted) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(2.5, rel.strength * 1.2);
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
        } else {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1.2, rel.strength * 0.85);
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label in midpoint
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        const labelText = rel.label;

        if (transform.scale > 0.6 || isHighlighted) {
          ctx.font = '10px "Plus Jakarta Sans", sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const textW = textMetrics.width;
          const pad = 4;

          ctx.fillStyle = isHighlighted ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.75)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(midX - textW / 2 - pad, midY - 8, textW + pad * 2, 16, 4);
          } else {
            ctx.rect(midX - textW / 2 - pad, midY - 8, textW + pad * 2, 16);
          }
          ctx.fill();

          ctx.strokeStyle = isHighlighted ? '#60a5fa' : 'rgba(51, 65, 85, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = isHighlighted ? '#93c5fd' : '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, midX, midY);
        }
      });

      // ==========================================
      // 3. DRAW CONNECTING PREVIEW LINE
      // ==========================================
      if (connectingSourceId && connectingTargetPos) {
        const srcNode = nodeMap.get(connectingSourceId);
        if (srcNode) {
          ctx.beginPath();
          ctx.moveTo(srcNode.x, srcNode.y);
          ctx.lineTo(connectingTargetPos.x, connectingTargetPos.y);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }
      }

      // ==========================================
      // 4. DRAW NODES (Visible Members)
      // ==========================================
      nodes.forEach((n) => {
        const isSelected = n.id === selectedMemberId;
        const isCenter = n.id === centerMemberId;
        const isHovered = n.id === hoveredNodeIdRef.current;
        const isConnectingSource = n.id === connectingSourceId;

        // Outer glow
        if (isCenter || isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + (isCenter ? 12 : 8), 0, Math.PI * 2);
          ctx.fillStyle = isCenter
            ? 'rgba(245, 158, 11, 0.22)'
            : isSelected
            ? 'rgba(59, 130, 246, 0.3)'
            : 'rgba(255, 255, 255, 0.15)';
          ctx.fill();
        }

        // Connecting source pulsing ring in Edit mode
        if (isConnectingSource) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Node circle body
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.member.avatarColor || '#3b82f6';
        ctx.fill();

        // Node border ring
        ctx.lineWidth = isSelected ? 3.5 : isCenter ? 3 : 2;
        ctx.strokeStyle = isCenter ? '#fbbf24' : isSelected ? '#ffffff' : '#0f172a';
        ctx.stroke();

        // Member Avatar initial / symbol
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${isCenter ? 16 : 13}px "Plus Jakarta Sans", sans-serif`;
        const initial = isCenter ? '★' : n.member.name.charAt(0);
        ctx.fillText(initial, n.x, n.y);

        // Edit Mode badge cue
        if (canvasMode === 'edit' && isHovered) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.beginPath();
          ctx.arc(n.x + n.radius * 0.7, n.y - n.radius * 0.7, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Name and category subtitle below node
        const labelY = n.y + n.radius + 14;

        ctx.font = `600 ${isCenter ? 13 : 11}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillText(n.member.name, n.x, labelY);
        ctx.shadowBlur = 0;

        if (transform.scale > 0.75) {
          ctx.font = '9px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(n.member.group, n.x, labelY + 13);
        }
      });

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    visibleMembers,
    visibleRelationships,
    centerMemberId,
    selectedMemberId,
    viewMode,
    canvasMode,
    maxLayers,
    transform,
    connectingSourceId,
    connectingTargetPos,
    activeEdgeId,
  ]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const nodes = Array.from(nodesRef.current.values()).reverse();
    const hitNode = nodes.find((n) => {
      const dx = world.x - n.x;
      const dy = world.y - n.y;
      return dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6);
    });

    if (hitNode) {
      const now = Date.now();
      const isDoubleClick = lastClickRef.current.id === hitNode.id && (now - lastClickRef.current.time < 380);

      if (isDoubleClick) {
        // 點擊兩次：顯示編輯畫面
        onDoubleClickMember(hitNode.member);
        lastClickRef.current = { id: '', time: 0 };
        isDraggingNodeRef.current = null;
        return;
      }

      // 記錄第一次點擊
      lastClickRef.current = { id: hitNode.id, time: now };
      dragStartPosRef.current = { x: sx, y: sy, moved: false };

      // Connecting mode in Edit mode
      if (isConnectingMode && canvasMode === 'edit') {
        if (!connectingSourceId) {
          setConnectingSourceId(hitNode.id);
          setConnectingTargetPos(world);
        } else if (connectingSourceId !== hitNode.id) {
          onRequestConnect(connectingSourceId, hitNode.id);
          setConnectingSourceId(null);
          setConnectingTargetPos(null);
          setIsConnectingMode(false);
        }
        return;
      }

      // 點擊一次：選中並立即允許拖曳
      isDraggingNodeRef.current = hitNode.id;
      onSelectMember(hitNode.id);
      setActiveEdgeId(null);
      reheatSimulation(0.65);
      return;
    } else {
      lastClickRef.current = { id: '', time: 0 };
    }

    // Check hit test on edges (in Edit Mode)
    if (canvasMode === 'edit') {
      const hitEdge = visibleRelationships.find((rel) => {
        const s = nodesRef.current.get(rel.sourceId);
        const t = nodesRef.current.get(rel.targetId);
        if (!s || !t) return false;
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        const dx = world.x - midX;
        const dy = world.y - midY;
        return dx * dx + dy * dy <= 400;
      });

      if (hitEdge) {
        setActiveEdgeId(hitEdge.id);
        return;
      }
    }

    isPanningRef.current = true;
    panStartRef.current = { x: sx - transform.x, y: sy - transform.y };
    setActiveEdgeId(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (connectingSourceId) {
      setConnectingTargetPos(world);
    }

    if (isDraggingNodeRef.current) {
      const distMoved = Math.hypot(sx - dragStartPosRef.current.x, sy - dragStartPosRef.current.y);
      if (distMoved > 4) {
        dragStartPosRef.current.moved = true;
        // 正在拖曳移動，重設雙擊計時以免拖曳放開時被判定為點擊
        lastClickRef.current = { id: '', time: 0 };
      }
      const draggedNode = nodesRef.current.get(isDraggingNodeRef.current);
      if (draggedNode) {
        draggedNode.x = world.x;
        draggedNode.y = world.y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        reheatSimulation(0.5);
      }
      return;
    }

    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: sx - panStartRef.current.x,
        y: sy - panStartRef.current.y,
      }));
      return;
    }

    const nodes = Array.from(nodesRef.current.values()).reverse();
    const hit = nodes.find((n) => {
      const dx = world.x - n.x;
      const dy = world.y - n.y;
      return dx * dx + dy * dy <= n.radius * n.radius;
    });
    hoveredNodeIdRef.current = hit ? hit.id : null;
  };

  const handlePointerUp = () => {
    if (isDraggingNodeRef.current) {
      isDraggingNodeRef.current = null;
      alphaRef.current = 0.25;
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((prev) => {
      const nextScale = Math.min(3.0, Math.max(0.3, prev.scale * zoomFactor));
      return {
        ...prev,
        scale: nextScale,
      };
    });
  };

  const zoomIn = () => setTransform((prev) => ({ ...prev, scale: Math.min(3.0, prev.scale * 1.25) }));
  const zoomOut = () => setTransform((prev) => ({ ...prev, scale: Math.max(0.3, prev.scale * 0.8) }));

  const activeEdge = visibleRelationships.find((r) => r.id === activeEdgeId);
  const activeEdgeSource = activeEdge ? members.find((m) => m.id === activeEdge.sourceId) : null;
  const activeEdgeTarget = activeEdge ? members.find((m) => m.id === activeEdge.targetId) : null;
  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;

  const isFilteringActive = maxLayers !== 'all' || selectedGroupFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none touch-none bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Floating Mode & Unified Filter Bar HUD (同時控制層數、分類與搜尋) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[95vw]">
        {/* Row 1: Mode Switcher & Edit Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl">
            <button
              onClick={() => {
                onChangeCanvasMode('display');
                setIsConnectingMode(false);
                setConnectingSourceId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                canvasMode === 'display'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>顯示模式</span>
            </button>
            <button
              onClick={() => onChangeCanvasMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                canvasMode === 'edit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>編輯模式</span>
            </button>
          </div>

          {canvasMode === 'edit' && (
            <button
              onClick={() => {
                setIsConnectingMode(!isConnectingMode);
                setConnectingSourceId(null);
                setConnectingTargetPos(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-xl backdrop-blur-md ${
                isConnectingMode
                  ? 'bg-sky-600 text-white shadow-sky-500/20 ring-2 ring-sky-400'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isConnectingMode ? '點選起點與終點成員' : '拉線建立新關係'}</span>
            </button>
          )}

          {/* Quick Double-click Tip in Display Mode */}
          {canvasMode === 'display' && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              <MousePointer className="w-3 h-3 text-sky-400" />
              <span>雙擊單元快速編輯</span>
            </div>
          )}
        </div>

        {/* Row 2: Simultaneous Layer, Category & Search Quick Strip (顯示幾層 + 分類 + 搜尋) */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs">
          {/* Layer Selector */}
          <div className="flex items-center gap-1 pl-1">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
              <span className="hidden sm:inline">層級:</span>
            </span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                onClick={() => onChangeMaxLayers(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  maxLayers === 1 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1層
              </button>
              <button
                onClick={() => onChangeMaxLayers(2)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  maxLayers === 2 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2層
              </button>
              <button
                onClick={() => onChangeMaxLayers(3)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  maxLayers === 3 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3層
              </button>
              <button
                onClick={() => onChangeMaxLayers('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  maxLayers === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部
              </button>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Group Category Selector */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            <select
              value={selectedGroupFilter}
              onChange={(e) => onChangeGroupFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="all">全部分類圈層</option>
              {allGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Inline Quick Search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜尋姓名、電話、自訂欄位..."
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              className="pl-6 pr-6 py-1 w-36 sm:w-44 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => onChangeSearchQuery('')}
                className="absolute right-1.5 top-1.5 text-slate-400 hover:text-white text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Matches Count & Reset button */}
          <div className="flex items-center gap-1.5 pl-1 text-[11px]">
            <span className="text-slate-400 font-mono">
              顯示 <span className="text-sky-300 font-bold">{visibleMembers.length}</span> / {members.length} 人
            </span>

            {isFilteringActive && (
              <button
                onClick={() => {
                  onChangeMaxLayers('all');
                  onChangeGroupFilter('all');
                  onChangeSearchQuery('');
                }}
                title="重設全部篩選"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] transition"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>重設</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Member Floating Action Badge */}
      {selectedMember && (
        <div className="absolute bottom-20 left-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/20"
            style={{ backgroundColor: selectedMember.avatarColor || '#3b82f6' }}
          />
          <div className="flex flex-col pr-1">
            <span className="text-xs font-semibold text-white leading-tight">
              {selectedMember.name}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              {selectedMember.group} · 點擊拖曳 / 雙擊編輯
            </span>
          </div>
          <div className="w-px h-5 bg-slate-800 mx-0.5" />
          <button
            onClick={() => onDoubleClickMember(selectedMember)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 transition flex items-center gap-1"
            title="雙擊此單元亦可直接開啟編輯視窗"
          >
            編輯 (雙擊)
          </button>
          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="展開詳細資料面板"
            >
              詳細資料
            </button>
          )}
          <button
            onClick={() => onSelectMember('')}
            className="p-1 text-slate-400 hover:text-white rounded-md transition text-xs"
            title="取消選取"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Canvas Controls HUD */}
      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl z-20">
        <button
          onClick={zoomIn}
          title="放大視圖"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="縮小視圖"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <button
          onClick={handleResetView}
          title="重設視圖中心"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (selectedMemberId) onSetAsCenter(selectedMemberId);
          }}
          disabled={!selectedMemberId || selectedMemberId === centerMemberId}
          title={selectedMemberId ? '以此人物為中心重構網絡' : '請先點選人物'}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
            selectedMemberId && selectedMemberId !== centerMemberId
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'text-slate-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>以他為核心</span>
        </button>
      </div>

      {/* Selected Edge Action Floating Card (Edit Mode) */}
      {canvasMode === 'edit' && activeEdge && activeEdgeSource && activeEdgeTarget && (
        <div className="absolute top-4 right-4 z-30 p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl max-w-xs text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200">關係連線資訊</span>
            <button
              onClick={() => setActiveEdgeId(null)}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="py-2.5 space-y-1.5 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">連線成員</span>
              <span className="font-medium text-slate-100">
                {activeEdgeSource.name} ↔ {activeEdgeTarget.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">關係標籤</span>
              <span className="text-sky-300 font-medium">{activeEdge.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">關係分類</span>
              <span className="text-slate-300">{activeEdge.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">關係緊密度</span>
              <span className="font-mono text-amber-400">★ {activeEdge.strength}/5</span>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2 border-t border-slate-800">
            <button
              onClick={() => {
                onSeverRelationship(activeEdge.id);
                setActiveEdgeId(null);
              }}
              className="w-full py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium transition text-center"
            >
              切斷此關係連線
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
