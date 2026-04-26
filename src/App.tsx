import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SKUEditPanel } from './components/SKUEditPanel';
import { Controls } from './components/Controls';
import { ResultGallery } from './components/ResultGallery';
import { autoPair } from './utils/pairing';
import { batchAnalyze, batchGenerate } from './services/butsudoriEngine';
import type { GarmentAnalysis, OutputMode, SKUPair, SKUResult } from './types';

const API_KEY_STORAGE = 'lumina-products-gemini-key';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [pairs, setPairs] = useState<SKUPair[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, GarmentAnalysis>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<OutputMode>('flatlay');
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, SKUResult>>({});

  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) setApiKey(saved);
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && !saved) setApiKey(envKey);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

  const startAnalysis = async (newPairs: SKUPair[]) => {
    if (!apiKey) return;
    setAnalyzingIds(prev => {
      const next = new Set(prev);
      for (const p of newPairs) next.add(p.id);
      return next;
    });

    await batchAnalyze(apiKey, newPairs, concurrency, (skuId, analysis, error) => {
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(skuId); return next; });
      if (error) {
        setAnalyzeErrors(prev => ({ ...prev, [skuId]: error }));
      } else if (analysis) {
        setAnalyses(prev => ({ ...prev, [skuId]: analysis }));
        setAnalyzeErrors(prev => { const next = { ...prev }; delete next[skuId]; return next; });
      }
    });
  };

  const onFiles = async (files: File[]) => {
    if (files.length % 2 !== 0) {
      alert(`奇数枚 (${files.length}) です。front/back 各1枚 = 偶数枚で投入してください。`);
      return;
    }
    if (!apiKey) {
      alert('先に Gemini API Key を入力してください。');
      return;
    }
    const next = autoPair(files);
    setPairs(prev => [...prev, ...next]);
    startAnalysis(next);
  };

  const updatePair = (next: SKUPair) => {
    setPairs(prev => prev.map(p => p.id === next.id ? next : p));
  };
  const removePair = (id: string) => {
    setPairs(prev => prev.filter(p => p.id !== id));
    setAnalyses(prev => { const next = { ...prev }; delete next[id]; return next; });
  };
  const updateAnalysis = (skuId: string, a: GarmentAnalysis) => {
    setAnalyses(prev => ({ ...prev, [skuId]: a }));
  };
  const reanalyze = (pair: SKUPair) => {
    setAnalyses(prev => { const next = { ...prev }; delete next[pair.id]; return next; });
    setAnalyzeErrors(prev => { const next = { ...prev }; delete next[pair.id]; return next; });
    startAnalysis([pair]);
  };

  const start = async () => {
    if (!apiKey || pairs.length === 0) return;
    const missing = pairs.filter(p => !analyses[p.id]);
    if (missing.length > 0) {
      alert(`${missing.length} SKU の解析がまだ完了していません。`);
      return;
    }
    setRunning(true);
    const initial: Record<string, SKUResult> = {};
    for (const p of pairs) {
      initial[p.id] = { pair: p, status: 'pending', progress: 0, outputs: {}, analysis: analyses[p.id] };
    }
    setResults(initial);

    await batchGenerate(apiKey, pairs, analyses, mode, concurrency, (skuId, partial) => {
      setResults(prev => ({
        ...prev,
        [skuId]: { ...prev[skuId], ...partial, outputs: { ...prev[skuId].outputs, ...(partial.outputs ?? {}) } },
      }));
    });

    setRunning(false);
  };

  const resultArray = pairs.map(p => results[p.id]).filter(Boolean);
  const analyzedCount = pairs.filter(p => analyses[p.id]).length;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1600px] p-8 space-y-6">
        <DropZone onFiles={onFiles} />

        {pairs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#888]">
                  SKU ({pairs.length}) · 解析済み {analyzedCount}/{pairs.length}
                </h2>
                <div className="text-xs text-[#555]">⚠ ハイライト項目は AI が「unclear」と判定 → 手動訂正推奨</div>
              </div>
              {pairs.map(p => (
                <SKUEditPanel
                  key={p.id}
                  pair={p}
                  analysis={analyses[p.id] || null}
                  analyzing={analyzingIds.has(p.id)}
                  analyzeError={analyzeErrors[p.id]}
                  onUpdatePair={updatePair}
                  onUpdateAnalysis={a => updateAnalysis(p.id, a)}
                  onRemove={() => removePair(p.id)}
                  onReanalyze={() => reanalyze(p)}
                />
              ))}
            </div>
            <Controls
              apiKey={apiKey}
              onApiKey={setApiKey}
              mode={mode}
              onMode={setMode}
              concurrency={concurrency}
              onConcurrency={setConcurrency}
              pairsCount={pairs.length}
              running={running}
              onStart={start}
            />
          </div>
        )}

        <ResultGallery results={resultArray} />
      </main>

      <footer className="border-t border-[#1a1a2e] mt-12 px-8 py-6 text-center text-xs text-[#555]">
        LUMINA PRODUCTS v0.2 · TomorrowProof, Inc.
      </footer>
    </div>
  );
}
