import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { PairList } from './components/PairList';
import { Controls } from './components/Controls';
import { ResultGallery } from './components/ResultGallery';
import { autoPair } from './utils/pairing';
import { runBatch } from './services/butsudoriEngine';
import type { OutputMode, SKUPair, SKUResult } from './types';

const API_KEY_STORAGE = 'lumina-products-gemini-key';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [pairs, setPairs] = useState<SKUPair[]>([]);
  const [mode, setMode] = useState<OutputMode>('flatlay');
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, SKUResult>>({});

  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) setApiKey(saved);
    // also pick up Vite env var if present (dev convenience)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (envKey && !saved) setApiKey(envKey);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

  const onFiles = (files: File[]) => {
    if (files.length % 2 !== 0) {
      alert(`奇数枚 (${files.length}) です。front/back 各1枚 = 偶数枚で投入してください。`);
      return;
    }
    const next = autoPair(files);
    setPairs(prev => [...prev, ...next]);
  };

  const updatePair = (next: SKUPair[]) => setPairs(next);
  const removePair = (id: string) => setPairs(prev => prev.filter(p => p.id !== id));

  const start = async () => {
    if (!apiKey || pairs.length === 0) return;
    setRunning(true);
    const initial: Record<string, SKUResult> = {};
    for (const p of pairs) {
      initial[p.id] = { pair: p, status: 'pending', progress: 0, outputs: {} };
    }
    setResults(initial);

    await runBatch(apiKey, pairs, mode, concurrency, (skuId, partial) => {
      setResults(prev => ({
        ...prev,
        [skuId]: { ...prev[skuId], ...partial, outputs: { ...prev[skuId].outputs, ...(partial.outputs ?? {}) } },
      }));
    });

    setRunning(false);
  };

  const resultArray = pairs.map(p => results[p.id]).filter(Boolean);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1600px] p-8 space-y-6">
        <DropZone onFiles={onFiles} />

        {pairs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <PairList pairs={pairs} onUpdate={updatePair} onRemove={removePair} />
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
        LUMINA PRODUCTS v0.1 · TomorrowProof, Inc.
      </footer>
    </div>
  );
}
