import type { OutputMode } from '../types';

interface Props {
  apiKey: string;
  onApiKey: (k: string) => void;
  mode: OutputMode;
  onMode: (m: OutputMode) => void;
  concurrency: number;
  onConcurrency: (c: number) => void;
  pairsCount: number;
  running: boolean;
  onStart: () => void;
}

export function Controls(p: Props) {
  const estCost = p.mode === 'flatlay' ? p.pairsCount * 0.08
                : p.mode === 'ghost-mannequin' ? p.pairsCount * 0.16
                : p.pairsCount * 0.20;
  const estMin = p.mode === 'flatlay' ? Math.ceil(p.pairsCount * 0.5 / p.concurrency)
                : p.mode === 'ghost-mannequin' ? Math.ceil(p.pairsCount * 1.2 / p.concurrency)
                : Math.ceil(p.pairsCount * 1.7 / p.concurrency);

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] p-5 space-y-5">
      <div>
        <label className="block text-xs uppercase tracking-wider text-[#888] mb-2">Gemini API Key</label>
        <input
          type="password"
          value={p.apiKey}
          onChange={e => p.onApiKey(e.target.value)}
          placeholder="AIza..."
          className="w-full bg-[#0f0f14] border border-[#1a1a2e] rounded px-3 py-2 text-sm focus:border-[#00d4ff] outline-none font-mono"
        />
        <div className="text-[10px] text-[#555] mt-1">
          ローカルブラウザにのみ保存。サーバ送信なし。Vercel本番では env 経由で自動注入予定 (v0.2)。
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-[#888] mb-2">出力モード</label>
        <div className="flex gap-2">
          {(['flatlay', 'ghost-mannequin', 'both'] as OutputMode[]).map(m => (
            <button
              key={m}
              onClick={() => p.onMode(m)}
              className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                p.mode === m
                  ? 'border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]'
                  : 'border-[#1a1a2e] hover:border-[#333]'
              }`}
            >
              {m === 'flatlay' ? 'flat-lay (front+back)' : m === 'ghost-mannequin' ? 'ghost mannequin (4-view)' : 'both (6枚/SKU)'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-[#888] mb-2">並列数 ({p.concurrency})</label>
        <input
          type="range" min={1} max={6} step={1}
          value={p.concurrency}
          onChange={e => p.onConcurrency(parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1a1a2e]">
        <div className="text-xs text-[#888]">
          <div>SKU数: <span className="text-[#fafafa] font-semibold">{p.pairsCount}</span></div>
          <div>推定: {estMin}分 / 約${estCost.toFixed(2)}</div>
        </div>
        <button
          onClick={p.onStart}
          disabled={p.running || p.pairsCount === 0 || !p.apiKey}
          className="rounded bg-[#00d4ff] px-6 py-2.5 text-sm font-semibold text-[#050508] hover:bg-[#00ff88] transition-colors disabled:bg-[#1a1a2e] disabled:text-[#555]"
        >
          {p.running ? '生成中…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
