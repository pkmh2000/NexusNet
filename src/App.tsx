import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Member,
  Relationship,
  NetworkGraphData,
  ViewMode,
  CanvasMode,
  LayerFilter,
  RelationCategory,
} from './types';
import { loadNetwork, saveNetwork, INITIAL_DATA } from './utils/storage';
import { TopNavbar } from './components/TopNavbar';
import { ContactsSidebar } from './components/ContactsSidebar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { MemberDetailDrawer } from './components/MemberDetailDrawer';
import { MemberEditModal } from './components/MemberEditModal';
import { RelationshipModal } from './components/RelationshipModal';
import { DashboardStatsModal } from './components/DashboardStatsModal';
import { SyncModal } from './components/SyncModal';
import { Users, ArrowRightLeft } from 'lucide-react';

export default function App() {
  const [network, setNetwork] = useState<NetworkGraphData>(() => loadNetwork());
  const [centerMemberId, setCenterMemberId] = useState<string>(() => {
    const center = network.members.find((m) => m.isCenter);
    return center ? center.id : network.members[0]?.id || 'm-me';
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('force');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('display'); // 平常預設為顯示模式
  const [maxLayers, setMaxLayers] = useState<LayerFilter>('all'); // 顯示層級設定：1層 / 2層 / 3層 / 全部
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  // Modals & Drawers
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  const [connectingPair, setConnectingPair] = useState<{ sourceId: string | null; targetId: string | null }>({
    sourceId: null,
    targetId: null,
  });
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [incomingSync, setIncomingSync] = useState<{
    data: NetworkGraphData;
    sourceMembersCount: number;
    sourceRelCount: number;
  } | null>(null);

  // Check URL hash on mount or hashchange for incoming cross-device sync link
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash.includes('#sync=')) {
        try {
          const hashToken = hash.split('#sync=')[1];
          if (!hashToken) return;
          const rawJson = decodeURIComponent(escape(atob(hashToken)));
          const parsed = JSON.parse(rawJson);
          if (parsed.members && Array.isArray(parsed.members) && parsed.relationships) {
            setIncomingSync({
              data: parsed,
              sourceMembersCount: parsed.members.length,
              sourceRelCount: parsed.relationships.length,
            });
          }
        } catch (err) {
          console.warn('Failed to parse incoming sync from hash:', err);
        }
      }
    };

    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Auto-save to localStorage whenever network changes
  useEffect(() => {
    saveNetwork(network);
  }, [network]);

  // Derived list of all distinct groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    network.members.forEach((m) => {
      if (m.group) set.add(m.group);
    });
    return Array.from(set);
  }, [network.members]);

  // Degrees of separation map from centerMemberId via BFS
  const degreesMap = useMemo(() => {
    const degrees = new Map<string, number>();
    degrees.set(centerMemberId, 0);

    const adj = new Map<string, string[]>();
    network.members.forEach((m) => adj.set(m.id, []));
    network.relationships.forEach((r) => {
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

    network.members.forEach((m) => {
      if (!degrees.has(m.id)) degrees.set(m.id, 99);
    });

    return degrees;
  }, [network.members, network.relationships, centerMemberId]);

  // Selected member object
  const selectedMember = useMemo(() => {
    return network.members.find((m) => m.id === selectedMemberId) || null;
  }, [network.members, selectedMemberId]);

  // Handlers for Member mutations
  const handleSaveMember = useCallback((memberData: Partial<Member>) => {
    if (editingMember) {
      // Update existing
      setNetwork((prev) => {
        const nextMembers = prev.members.map((m) =>
          m.id === editingMember.id
            ? { ...m, ...memberData, updatedAt: Date.now() }
            : m
        );
        return { ...prev, members: nextMembers };
      });
      setEditingMember(null);
    } else {
      // Create new member
      const newId = `m-${Date.now()}`;
      const newMember: Member = {
        id: newId,
        name: memberData.name || '新成員',
        nickname: memberData.nickname,
        avatarColor: memberData.avatarColor || '#3b82f6',
        group: memberData.group || '日常社交',
        isCenter: false,
        customFields: memberData.customFields || [],
        notes: memberData.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Automatically create a default relationship to current center member
      const defaultRel: Relationship = {
        id: `r-${Date.now()}`,
        sourceId: centerMemberId,
        targetId: newId,
        label: '新認識',
        category: '社交',
        strength: 3,
        createdAt: Date.now(),
      };

      setNetwork((prev) => ({
        members: [...prev.members, newMember],
        relationships: [...prev.relationships, defaultRel],
      }));

      setSelectedMemberId(newId);

      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      } catch (_) {}
    }
  }, [editingMember, centerMemberId]);

  const handleUpdateMember = useCallback((updated: Member) => {
    setNetwork((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
  }, []);

  const handleDeleteMember = useCallback((memberId: string) => {
    setNetwork((prev) => ({
      members: prev.members.filter((m) => m.id !== memberId),
      relationships: prev.relationships.filter(
        (r) => r.sourceId !== memberId && r.targetId !== memberId
      ),
    }));

    if (selectedMemberId === memberId) {
      setSelectedMemberId(null);
    }
    if (centerMemberId === memberId) {
      const remaining = network.members.filter((m) => m.id !== memberId);
      if (remaining.length > 0) {
        setCenterMemberId(remaining[0].id);
      }
    }
  }, [selectedMemberId, centerMemberId, network.members]);

  const handleSetAsCenter = useCallback((memberId: string) => {
    setCenterMemberId(memberId);
    setNetwork((prev) => ({
      ...prev,
      members: prev.members.map((m) => ({
        ...m,
        isCenter: m.id === memberId,
      })),
    }));
    try {
      confetti({ particleCount: 25, spread: 40, origin: { y: 0.7 } });
    } catch (_) {}
  }, []);

  // Handlers for Relationship mutations
  const handleSaveRelationship = useCallback((relData: {
    sourceId: string;
    targetId: string;
    label: string;
    category: RelationCategory;
    strength: number;
    notes?: string;
  }) => {
    if (editingRelationship) {
      // Update existing relationship
      setNetwork((prev) => ({
        ...prev,
        relationships: prev.relationships.map((r) =>
          r.id === editingRelationship.id
            ? {
                ...r,
                sourceId: relData.sourceId,
                targetId: relData.targetId,
                label: relData.label,
                category: relData.category,
                strength: relData.strength,
                notes: relData.notes,
              }
            : r
        ),
      }));
      setEditingRelationship(null);
    } else {
      const existingIndex = network.relationships.findIndex(
        (r) =>
          (r.sourceId === relData.sourceId && r.targetId === relData.targetId) ||
          (r.sourceId === relData.targetId && r.targetId === relData.sourceId)
      );

      if (existingIndex >= 0) {
        setNetwork((prev) => {
          const next = [...prev.relationships];
          next[existingIndex] = {
            ...next[existingIndex],
            sourceId: relData.sourceId,
            targetId: relData.targetId,
            label: relData.label,
            category: relData.category,
            strength: relData.strength,
            notes: relData.notes,
          };
          return { ...prev, relationships: next };
        });
      } else {
        const newRel: Relationship = {
          id: `r-${Date.now()}`,
          sourceId: relData.sourceId,
          targetId: relData.targetId,
          label: relData.label,
          category: relData.category,
          strength: relData.strength,
          notes: relData.notes,
          createdAt: Date.now(),
        };
        setNetwork((prev) => ({
          ...prev,
          relationships: [...prev.relationships, newRel],
        }));
      }
    }

    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.75 } });
    } catch (_) {}
  }, [editingRelationship, network.relationships]);

  const handleSeverRelationship = useCallback((relationshipId: string) => {
    setNetwork((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== relationshipId),
    }));
    setEditingRelationship((curr) => (curr?.id === relationshipId ? null : curr));
  }, []);

  const handleRequestConnect = useCallback((sourceId: string, targetId: string) => {
    setEditingRelationship(null);
    setConnectingPair({ sourceId, targetId });
    setIsRelationshipModalOpen(true);
  }, []);

  // Double-click relationship or click edit
  const handleEditRelationship = useCallback((rel: Relationship) => {
    setEditingRelationship(rel);
    setConnectingPair({ sourceId: rel.sourceId, targetId: rel.targetId });
    setIsRelationshipModalOpen(true);
  }, []);

  const handleImportData = useCallback((data: NetworkGraphData, mode: 'replace' | 'merge' = 'replace') => {
    if (mode === 'replace') {
      setNetwork(data);
      const center = data.members.find((m) => m.isCenter) || data.members[0];
      if (center) setCenterMemberId(center.id);
      setSelectedMemberId(null);
    } else {
      setNetwork((prev) => {
        const memberMap = new Map<string, Member>();
        prev.members.forEach((m) => memberMap.set(m.id, m));
        data.members.forEach((m) => {
          if (memberMap.has(m.id)) {
            const existing = memberMap.get(m.id)!;
            memberMap.set(m.id, {
              ...existing,
              ...m,
              updatedAt: Math.max(existing.updatedAt || 0, m.updatedAt || Date.now()),
            });
          } else {
            memberMap.set(m.id, m);
          }
        });

        const relMap = new Map<string, Relationship>();
        prev.relationships.forEach((r) => relMap.set(r.id, r));
        data.relationships.forEach((r) => {
          relMap.set(r.id, r);
        });

        return {
          members: Array.from(memberMap.values()),
          relationships: Array.from(relMap.values()),
        };
      });
    }

    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (_) {}
  }, []);

  const handleRestoreData = useCallback((restored: NetworkGraphData) => {
    handleImportData(restored, 'replace');
  }, [handleImportData]);

  const handleResetData = useCallback(() => {
    setNetwork(INITIAL_DATA);
    setCenterMemberId('m-me');
    setSelectedMemberId(null);
    setMaxLayers('all');
    setSelectedGroupFilter('all');
    setSearchQuery('');
  }, []);

  const handleSelectMember = useCallback((memberId: string | null, openDrawer = false) => {
    setSelectedMemberId(memberId);
    if (openDrawer && memberId) {
      setIsDetailDrawerOpen(true);
    } else if (!memberId) {
      setIsDetailDrawerOpen(false);
    }
  }, []);

  // Double-click to directly edit member
  const handleDoubleClickMember = useCallback((member: Member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Bar Contract (3 Zones) */}
      <TopNavbar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        canvasMode={canvasMode}
        onChangeCanvasMode={setCanvasMode}
        maxLayers={maxLayers}
        onChangeMaxLayers={setMaxLayers}
        onOpenNewMemberModal={() => {
          setEditingMember(null);
          setIsMemberModalOpen(true);
        }}
        onOpenDashboard={() => setIsDashboardModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGroupFilter={selectedGroupFilter}
        onGroupFilterChange={setSelectedGroupFilter}
        allGroups={allGroups}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative overflow-hidden pb-14 md:pb-0">
        {/* Left Contacts Directory Sidebar */}
        <ContactsSidebar
          members={network.members}
          relationships={network.relationships}
          centerMemberId={centerMemberId}
          selectedMemberId={selectedMemberId}
          onSelectMember={(id) => {
            handleSelectMember(id, true);
            setIsMobileSidebarOpen(false);
          }}
          onSetAsCenter={handleSetAsCenter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGroup={selectedGroupFilter}
          onSelectGroup={setSelectedGroupFilter}
          maxLayers={maxLayers}
          onChangeMaxLayers={setMaxLayers}
          allGroups={allGroups}
          degreesMap={degreesMap}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Canvas Area */}
        <main className="flex-1 relative h-full overflow-hidden">
          <NetworkCanvas
            members={network.members}
            relationships={network.relationships}
            centerMemberId={centerMemberId}
            selectedMemberId={selectedMemberId}
            viewMode={viewMode}
            canvasMode={canvasMode}
            onChangeCanvasMode={setCanvasMode}
            maxLayers={maxLayers}
            onChangeMaxLayers={setMaxLayers}
            selectedGroupFilter={selectedGroupFilter}
            onChangeGroupFilter={setSelectedGroupFilter}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            allGroups={allGroups}
            onSelectMember={(id) => handleSelectMember(id, false)}
            onDoubleClickMember={handleDoubleClickMember}
            onDoubleClickRelationship={handleEditRelationship}
            onOpenDrawer={() => setIsDetailDrawerOpen(true)}
            onRequestConnect={handleRequestConnect}
            onSeverRelationship={handleSeverRelationship}
            onSetAsCenter={handleSetAsCenter}
          />

          {/* Sidebar Trigger Floating Button (Tablet md..lg only; on mobile the bottom bar has dedicated 成員名單 tab) */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="hidden md:flex lg:hidden absolute bottom-6 right-6 z-20 items-center gap-1.5 p-3 rounded-2xl bg-sky-600 text-white shadow-xl shadow-sky-600/30"
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-semibold">成員列表</span>
          </button>
        </main>

        {/* Right Member Detail Slide-over Panel */}
        {selectedMember && isDetailDrawerOpen && (
          <div className="w-full sm:w-88 md:w-96 shrink-0 h-full z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <MemberDetailDrawer
              member={selectedMember}
              allMembers={network.members}
              relationships={network.relationships}
              isCenter={selectedMember.id === centerMemberId}
              onClose={() => setIsDetailDrawerOpen(false)}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onSetAsCenter={handleSetAsCenter}
              onSelectMember={(id) => handleSelectMember(id, true)}
              onSeverRelationship={handleSeverRelationship}
              onOpenConnectModal={(srcId) => {
                setEditingRelationship(null);
                setConnectingPair({ sourceId: srcId, targetId: null });
                setIsRelationshipModalOpen(true);
              }}
              onEditRelationship={handleEditRelationship}
              onEditMemberModal={(m) => {
                setEditingMember(m);
                setIsMemberModalOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Member Creation/Edit Modal */}
      <MemberEditModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
        onDelete={handleDeleteMember}
        initialMember={editingMember}
      />

      {/* Relationship Connect / Edit Modal */}
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        sourceId={connectingPair.sourceId}
        targetId={connectingPair.targetId}
        allMembers={network.members}
        editingRelationship={editingRelationship}
        onClose={() => {
          setIsRelationshipModalOpen(false);
          setEditingRelationship(null);
          setConnectingPair({ sourceId: null, targetId: null });
        }}
        onSave={handleSaveRelationship}
        onDeleteRelationship={handleSeverRelationship}
      />

      {/* Resource & Monitoring Dashboard Modal */}
      <DashboardStatsModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        network={network}
        onRestoreData={handleRestoreData}
        onResetData={handleResetData}
        onSelectMember={setSelectedMemberId}
      />

      {/* Cross-Device Sync Modal (Mobile / Tablet / Desktop) */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        network={network}
        onImportData={handleImportData}
      />

      {/* Incoming Sync Confirmation Dialog (When opened via QR code or shared sync link) */}
      {incomingSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-sky-500/40 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">收到跨裝置人際圖譜同步！</h3>
                <p className="text-xs text-sky-300">偵測到來自其他裝置的圖譜資料</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>傳入成員數：</span>
                <span className="font-bold text-sky-400">{incomingSync.sourceMembersCount} 位</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>傳入關係連線：</span>
                <span className="font-bold text-sky-400">{incomingSync.sourceRelCount} 條</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>本機目前資料：</span>
                <span>{network.members.length} 位成員 · {network.relationships.length} 條關係</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  handleImportData(incomingSync.data, 'replace');
                  window.history.replaceState(null, '', window.location.pathname);
                  setIncomingSync(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-1.5"
              >
                <span>立即完全覆蓋同步 (推薦)</span>
              </button>

              <button
                onClick={() => {
                  handleImportData(incomingSync.data, 'merge');
                  window.history.replaceState(null, '', window.location.pathname);
                  setIncomingSync(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
              >
                <span>智慧合併 (保留本機新加人物)</span>
              </button>

              <button
                onClick={() => {
                  window.history.replaceState(null, '', window.location.pathname);
                  setIncomingSync(null);
                }}
                className="w-full py-1.5 text-center text-slate-400 hover:text-slate-200 text-xs transition"
              >
                略過並取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
