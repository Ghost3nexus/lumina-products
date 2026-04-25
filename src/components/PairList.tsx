import { useEffect, useMemo } from 'react';
import type { SKUPair } from '../types';
import { swapPair, renamePair, objectURLForFile } from '../utils/pairing';

interface Props {
  pairs: SKUPair[];
  onUpdate: (next: SKUPair[]) => void;
  onRemove: (id: string) => void;
}

export function PairList({ pairs, onUpdate, onRemove }: Props) {
  const urlMap = useMemo(() => {
    const map: Record<string, { front: string; back: string }> = {};
    for (const p of pairs) {
      map[p.id] = { front: objectURLForFile(p.frontFile), back: objectURLForFile(p.backFile) };
    }
    return map;
  }, [pairs]);

  useEffect(() => () => {
    Object.values(urlMap).forEach(u => { URL.revokeObjectURL(u.front); URL.revokeObjectURL(u.back); });
  }, [urlMap]);

  if (pairs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#888]">
          SKU ペア ({pairs.length})
        </h2>
        <div className="text-xs text-[#555]">front/back が逆なら ⇄、SKU名はクリックで編集</div>
      </div>
      {pairs.map(p => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] p-3">
          <input
            type="text"
            value={p.sku}
            onChange={e => onUpdate(pairs.map(x => x.id === p.id ? renamePair(x, e.target.value) : x))}
            className="w-44 bg-transparent border border-[#1a1a2e] rounded px-2 py-1 text-sm focus:border-[#00d4ff] outline-none"
          />

          <div className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <img src={urlMap[p.id]?.front} className="h-16 w-16 object-cover rounded border border-[#1a1a2e]" alt="front" />
              <span className="text-[10px] text-[#888]">FRONT</span>
              <span className="text-[10px] text-[#555] truncate w-16">{p.frontFile.name}</span>
            </div>

            <button
              onClick={() => onUpdate(pairs.map(x => x.id === p.id ? swapPair(x) : x))}
              className="rounded border border-[#1a1a2e] hover:border-[#00d4ff] hover:text-[#00d4ff] px-2 py-1 text-sm transition-colors"
              title="front/back 入れ替え"
            >⇄</button>

            <div className="flex flex-col items-center gap-1">
              <img src={urlMap[p.id]?.back} className="h-16 w-16 object-cover rounded border border-[#1a1a2e]" alt="back" />
              <span className="text-[10px] text-[#888]">BACK</span>
              <span className="text-[10px] text-[#555] truncate w-16">{p.backFile.name}</span>
            </div>
          </div>

          <button
            onClick={() => onRemove(p.id)}
            className="text-xs text-[#555] hover:text-[#ff3366] transition-colors"
            title="削除"
          >削除</button>
        </div>
      ))}
    </div>
  );
}
