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
import { Users } from 'lucide-react';

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
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [connectingPair, setConnectingPair] = useState<{ sourceId: string | null; targetId: string | null }>({
    sourceId: null,
    targetId: null,
  });
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.75 } });
    } catch (_) {}
  }, [network.relationships]);

  const handleSeverRelationship = useCallback((relationshipId: string) => {
    setNetwork((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== relationshipId),
    }));
  }, []);

  const handleRequestConnect = useCallback((sourceId: string, targetId: string) => {
    setConnectingPair({ sourceId, targetId });
    setIsRelationshipModalOpen(true);
  }, []);

  const handleRestoreData = useCallback((restored: NetworkGraphData) => {
    setNetwork(restored);
    const center = restored.members.find((m) => m.isCenter) || restored.members[0];
    if (center) setCenterMemberId(center.id);
    setSelectedMemberId(null);
  }, []);

  const handleResetData = useCallback(() => {
    setNetwork(INITIAL_DATA);
    setCenterMemberId('m-me');
    setSelectedMemberId(null);
    setMaxLayers('all');
    setSelectedGroupFilter('all');
    setSearchQuery('');
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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGroupFilter={selectedGroupFilter}
        onGroupFilterChange={setSelectedGroupFilter}
        allGroups={allGroups}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Contacts Directory Sidebar */}
        <ContactsSidebar
          members={network.members}
          relationships={network.relationships}
          centerMemberId={centerMemberId}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
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
            onSelectMember={setSelectedMemberId}
            onDoubleClickMember={handleDoubleClickMember}
            onRequestConnect={handleRequestConnect}
            onSeverRelationship={handleSeverRelationship}
            onSetAsCenter={handleSetAsCenter}
          />

          {/* Mobile Sidebar Trigger Floating Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden absolute bottom-6 right-6 z-20 flex items-center gap-1.5 p-3 rounded-2xl bg-sky-600 text-white shadow-xl shadow-sky-600/30"
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-semibold">成員列表</span>
          </button>
        </main>

        {/* Right Member Detail Slide-over Panel */}
        {selectedMember && (
          <div className="w-full sm:w-88 md:w-96 shrink-0 h-full z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <MemberDetailDrawer
              member={selectedMember}
              allMembers={network.members}
              relationships={network.relationships}
              isCenter={selectedMember.id === centerMemberId}
              onClose={() => setSelectedMemberId(null)}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onSetAsCenter={handleSetAsCenter}
              onSelectMember={setSelectedMemberId}
              onSeverRelationship={handleSeverRelationship}
              onOpenConnectModal={(srcId) => {
                setConnectingPair({ sourceId: srcId, targetId: null });
                setIsRelationshipModalOpen(true);
              }}
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
        initialMember={editingMember}
      />

      {/* Relationship Connect Modal */}
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        sourceId={connectingPair.sourceId}
        targetId={connectingPair.targetId}
        allMembers={network.members}
        onClose={() => {
          setIsRelationshipModalOpen(false);
          setConnectingPair({ sourceId: null, targetId: null });
        }}
        onSave={handleSaveRelationship}
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
    </div>
  );
}
