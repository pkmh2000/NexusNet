import React from 'react';
import { Member, Relationship, LayerFilter } from '../types';
import { Users, ChevronRight, Compass, Search, Filter, Layers } from 'lucide-react';

interface ContactsSidebarProps {
  members: Member[];
  relationships: Relationship[];
  centerMemberId: string;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string) => void;
  onSetAsCenter: (memberId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroup: string;
  onSelectGroup: (g: string) => void;
  maxLayers: LayerFilter;
  onChangeMaxLayers: (l: LayerFilter) => void;
  allGroups: string[];
  degreesMap: Map<string, number>;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({
  members,
  relationships,
  centerMemberId,
  selectedMemberId,
  onSelectMember,
  onSetAsCenter,
  searchQuery,
  onSearchChange,
  selectedGroup,
  onSelectGroup,
  maxLayers,
  onChangeMaxLayers,
  allGroups,
  degreesMap,
  isMobileOpen,
  onCloseMobile,
}) => {
  // Count connections per member
  const connectionCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.id] = relationships.filter((r) => r.sourceId === m.id || r.targetId === m.id).length;
    return acc;
  }, {});

  // Simultaneous filter: Layer + Group + Search
  const filteredMembers = members.filter((m) => {
    const isCenter = m.id === centerMemberId;
    const d = degreesMap.get(m.id) ?? 99;

    // 1. Layer filter
    if (maxLayers !== 'all') {
      if (d > maxLayers && !isCenter) return false;
    }

    // 2. Group filter
    if (selectedGroup !== 'all' && m.group !== selectedGroup && !isCenter) {
      return false;
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

  return (
    <aside
      className={`fixed lg:static inset-y-14 left-0 w-72 bg-slate-900 border-r border-slate-800 z-30 flex flex-col transition-transform duration-200 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Sidebar Header & Filters */}
      <div className="p-3.5 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Users className="w-4 h-4 text-sky-400" />
            <span>人際成員 ({filteredMembers.length}/{members.length})</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            收合
          </button>
        </div>

        {/* Mobile Search input */}
        <div className="relative lg:hidden">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜尋聯絡人與欄位..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Layer Depth selector in Sidebar */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" />
            <span>關係層級</span>
          </span>
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              onClick={() => onChangeMaxLayers(1)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                maxLayers === 1 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1層
            </button>
            <button
              onClick={() => onChangeMaxLayers(2)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                maxLayers === 2 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2層
            </button>
            <button
              onClick={() => onChangeMaxLayers(3)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                maxLayers === 3 ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3層
            </button>
            <button
              onClick={() => onChangeMaxLayers('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                maxLayers === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部
            </button>
          </div>
        </div>

        {/* Category Horizontal Filter Tags */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          <button
            onClick={() => onSelectGroup('all')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
              selectedGroup === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            全部圈層
          </button>
          {allGroups.map((g) => (
            <button
              key={g}
              onClick={() => onSelectGroup(g)}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
                selectedGroup === g
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Member List Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMembers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            查無符合目前層級、圈層與搜尋條件的成員
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isCenter = member.id === centerMemberId;
            const isSelected = member.id === selectedMemberId;
            const connCount = connectionCounts[member.id] || 0;
            const degree = degreesMap.get(member.id);

            return (
              <div
                key={member.id}
                onClick={() => {
                  onSelectMember(member.id);
                  if (window.innerWidth < 1024) onCloseMobile();
                }}
                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-sky-600/20 border border-sky-500/40 text-white'
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: member.avatarColor || '#3b82f6' }}
                  >
                    {isCenter ? '★' : member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      <span className="truncate">{member.name}</span>
                      {isCenter ? (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">
                          中心
                        </span>
                      ) : (
                        degree !== undefined && degree < 99 && (
                          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                            {degree}度
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <span>{member.group}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">{connCount} 連線</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetAsCenter(member.id);
                    }}
                    title="以此人為中心重構網絡"
                    className={`p-1 rounded hover:bg-slate-800 transition ${
                      isCenter ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
