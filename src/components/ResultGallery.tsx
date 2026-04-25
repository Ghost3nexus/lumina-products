import JSZip from 'jszip';
import type { SKUResult } from '../types';
import { SKUResultCard } from './SKUResultCard';

interface Props {
  results: SKUResult[];
}

async function downloadAllZip(results: SKUResult[]) {
  const zip = new JSZip();
  for (const r of results) {
    if (r.status !== 'done') continue;
    const folder = zip.folder(r.pair.sku)!;
    const o = r.outputs;
    const map: Record<string, string | undefined> = {
      'flatlay-front.png': o.flatlayFront,
      'flatlay-back.png':  o.flatlayBack,
      'gm-front.png':      o.gmFront,
      'gm-back.png':       o.gmBack,
      'gm-side.png':       o.gmSide,
      'gm-detail.png':     o.gmDetail,
    };
    for (const [name, dataUrl] of Object.entries(map)) {
      if (!dataUrl) continue;
      const base64 = dataUrl.split(',')[1];
      folder.file(name, base64, { base64: true });
    }
    if (r.analysis) {
      folder.file('analysis.json', JSON.stringify(r.analysis, null, 2));
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumina-products-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultGallery({ results }: Props) {
  if (results.length === 0) return null;

  const doneCount = results.filter(r => r.status === 'done').length;
  const errCount  = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#888]">
          結果 ({doneCount}/{results.length}{errCount ? ` · ✗ ${errCount}` : ''})
        </h2>
        {doneCount > 0 && (
          <button
            onClick={() => downloadAllZip(results)}
            className="rounded border border-[#00d4ff] px-4 py-1.5 text-xs text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
          >
            ZIP一括ダウンロード ({doneCount} SKU)
          </button>
        )}
      </div>
      <div className="space-y-3">
        {results.map(r => <SKUResultCard key={r.pair.id} result={r} />)}
      </div>
    </div>
  );
}
