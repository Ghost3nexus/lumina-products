import { useMemo } from 'react';
import type { SKUResult } from '../types';

interface Props {
  result: SKUResult;
}

function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function SKUResultCard({ result }: Props) {
  const refUrls = useMemo(() => ({
    front: URL.createObjectURL(result.pair.frontFile),
    back: URL.createObjectURL(result.pair.backFile),
  }), [result.pair]);

  const o = result.outputs;
  const sku = result.pair.sku;

  const statusColor = result.status === 'done' ? 'text-[#00ff88]'
                    : result.status === 'error' ? 'text-[#ff3366]'
                    : 'text-[#00d4ff]';

  return (
    <section className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">{sku}</h3>
          {result.analysis && (
            <div className="text-xs text-[#888] mt-0.5">
              {result.analysis.category} / {result.analysis.subtype} · {result.analysis.color_primary?.name} {result.analysis.color_primary?.hex} · {result.analysis.fabric_primary?.material}
            </div>
          )}
        </div>
        <div className={`text-xs ${statusColor}`}>
          {result.status === 'pending' && '待機中'}
          {result.status === 'analyzing' && '解析中…'}
          {result.status === 'generating' && '生成中…'}
          {result.status === 'done' && '完了'}
          {result.status === 'error' && `エラー: ${result.error}`}
        </div>
      </div>

      {result.status !== 'done' && result.status !== 'error' && (
        <div className="mb-3">
          <div className="h-1 bg-[#1a1a2e] rounded overflow-hidden">
            <div className="h-full bg-[#00d4ff] transition-all duration-300" style={{ width: `${result.progress}%` }} />
          </div>
          {result.message && <div className="text-xs text-[#555] mt-1">{result.message}</div>}
        </div>
      )}

      <div className="grid grid-cols-[120px_1fr] gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#555] mb-1">refs</div>
          <div className="space-y-1">
            <img src={refUrls.front} className="w-full rounded border border-[#1a1a2e]" alt="front ref" />
            <img src={refUrls.back} className="w-full rounded border border-[#1a1a2e]" alt="back ref" />
          </div>
        </div>

        <div className="space-y-3">
          {(o.flatlayFront || o.flatlayBack) && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#00d4ff] mb-1">flat-lay</div>
              <div className="grid grid-cols-2 gap-2">
                <Tile dataUrl={o.flatlayFront} label="FRONT" filename={`${sku}-flatlay-front.png`} />
                <Tile dataUrl={o.flatlayBack} label="BACK" filename={`${sku}-flatlay-back.png`} />
              </div>
            </div>
          )}
          {(o.gmFront || o.gmBack || o.gmSide || o.gmDetail) && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#00d4ff] mb-1">ghost mannequin</div>
              <div className="grid grid-cols-4 gap-2">
                <Tile dataUrl={o.gmFront}  label="FRONT"  filename={`${sku}-gm-front.png`} />
                <Tile dataUrl={o.gmBack}   label="BACK"   filename={`${sku}-gm-back.png`} />
                <Tile dataUrl={o.gmSide}   label="SIDE"   filename={`${sku}-gm-side.png`} />
                <Tile dataUrl={o.gmDetail} label="DETAIL" filename={`${sku}-gm-detail.png`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  function Tile({ dataUrl, label, filename }: { dataUrl?: string; label: string; filename: string }) {
    if (!dataUrl) return <div className="aspect-[3/4] rounded border border-[#1a1a2e] bg-[#0d0d12] flex items-center justify-center text-[10px] text-[#333]">{label}</div>;
    return (
      <button onClick={() => downloadDataURL(dataUrl, filename)} className="block group cursor-pointer text-left">
        <img src={dataUrl} className="w-full rounded border border-[#1a1a2e] group-hover:border-[#00d4ff] transition-colors" alt={label} />
        <div className="text-[10px] text-[#888] mt-1 group-hover:text-[#00d4ff] transition-colors">{label} ↓</div>
      </button>
    );
  }
}
