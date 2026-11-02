import React, { useState, useEffect } from 'react';
import { Member, Relationship, RelationCategory } from '../types';
import { X, Link2, Sparkles } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  sourceId: string | null;
  targetId: string | null;
  allMembers: Member[];
  onClose: () => void;
  onSave: (relData: {
    sourceId: string;
    targetId: string;
    label: string;
    category: RelationCategory;
    strength: number;
    notes?: string;
  }) => void;
}

const QUICK_LABELS = [
  '合夥人',
  '同事',
  '舊主管',
  '高中同窗',
  '大學同窗',
  '夫妻',
  '父子',
  '兄弟姊妹',
  '商務客戶',
  '投資引薦人',
  '技術顧問',
  '摯友',
];

const CATEGORIES: RelationCategory[] = ['親友', '職場', '社交', '商務合作', '學校學緣', '其他'];

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  sourceId: initialSourceId,
  targetId: initialTargetId,
  allMembers,
  onClose,
  onSave,
}) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<RelationCategory>('職場');
  const [strength, setStrength] = useState(4);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialSourceId) setSourceId(initialSourceId);
    else if (allMembers.length > 0) setSourceId(allMembers[0].id);

    if (initialTargetId) setTargetId(initialTargetId);
    else if (allMembers.length > 1) {
      const other = allMembers.find((m) => m.id !== (initialSourceId || allMembers[0].id));
      if (other) setTargetId(other.id);
    }

    setLabel('');
    setCategory('職場');
    setStrength(4);
    setNotes('');
  }, [initialSourceId, initialTargetId, isOpen, allMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) return;

    onSave({
      sourceId,
      targetId,
      label: label.trim(),
      category,
      strength,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-slate-100 text-sm">建立人際關係連線</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">起點成員</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === targetId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">目標成員</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === sourceId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              關係標籤 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：共同創辦人、高中同窗、天使投資人"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 mb-2"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LABELS.map((ql) => (
                <button
                  type="button"
                  key={ql}
                  onClick={() => setLabel(ql)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                    label === ql
                      ? 'bg-sky-500 text-white font-medium'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {ql}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">關係領域分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RelationCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">緊密程度 (影響畫布距離)</label>
                <span className="font-mono text-amber-400">{strength} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-sky-500 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">連線備忘說明</label>
            <input
              type="text"
              placeholder="例如：2023 年經教授介紹結識..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 transition font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition shadow-lg shadow-sky-600/20"
            >
              建立連線
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
