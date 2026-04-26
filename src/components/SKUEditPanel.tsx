import type { GarmentAnalysis, SKUPair } from '../types';
import { swapPair, renamePair, objectURLForFile } from '../utils/pairing';
import { useEffect, useMemo } from 'react';

interface Props {
  pair: SKUPair;
  analysis: GarmentAnalysis | null;
  analyzing: boolean;
  analyzeError?: string;
  onUpdatePair: (next: SKUPair) => void;
  onUpdateAnalysis: (a: GarmentAnalysis) => void;
  onRemove: () => void;
  onReanalyze: () => void;
}

const FABRIC_OPTIONS = ['unclear', 'cotton', 'denim', 'wool', 'cashmere', 'linen', 'silk', 'polyester', 'rayon', 'nylon', 'leather', 'velvet', 'corduroy', 'tweed', 'crepe', 'jersey knit', 'rib knit', 'fleece', 'cotton sateen'];
const SLEEVE_OPTIONS = ['unclear', 'sleeveless', 'short sleeve', 'long sleeve', 'three-quarter sleeve', 'cap sleeve', 'puff sleeve', 'spaghetti strap', 'halter strap'];
const NECKLINE_OPTIONS = ['unclear', 'crew neck', 'V-neck', 'scoop neck', 'square neck', 'mock turtleneck', 'turtleneck', 'collared shirt', 'pointed collar', 'halter', 'off-shoulder', 'boat neck'];
const POCKET_OPTIONS = ['none', 'patch pocket', 'welt pocket', 'flap pocket', 'slit pocket', 'cargo pocket', 'kangaroo pocket'];

function isUncertain(value?: string): boolean {
  if (!value) return true;
  const v = value.toLowerCase();
  return v === 'unclear' || v === '' || v === 'unknown' || v === 'n/a';
}

function ucBadge() {
  return <span className="ml-1.5 px-1 rounded bg-[#ffb800]/20 text-[#ffb800] text-[9px] font-bold">⚠ 要確認</span>;
}

export function SKUEditPanel({ pair, analysis, analyzing, analyzeError, onUpdatePair, onUpdateAnalysis, onRemove, onReanalyze }: Props) {
  const urls = useMemo(() => ({
    front: objectURLForFile(pair.frontFile),
    back: objectURLForFile(pair.backFile),
  }), [pair]);
  useEffect(() => () => { URL.revokeObjectURL(urls.front); URL.revokeObjectURL(urls.back); }, [urls]);

  const a = analysis;
  const updateField = (path: string[], value: any) => {
    if (!a) return;
    const next = JSON.parse(JSON.stringify(a)) as GarmentAnalysis;
    let cursor: any = next;
    for (let i = 0; i < path.length - 1; i++) {
      if (cursor[path[i]] === undefined || cursor[path[i]] === null) cursor[path[i]] = {};
      cursor = cursor[path[i]];
    }
    cursor[path[path.length - 1]] = value;
    onUpdateAnalysis(next);
  };

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] p-4">
      <div className="flex items-start gap-4">
        {/* Refs + SKU name */}
        <div className="flex flex-col items-start gap-2 flex-shrink-0">
          <input
            type="text"
            value={pair.sku}
            onChange={e => onUpdatePair(renamePair(pair, e.target.value))}
            className="w-44 bg-transparent border border-[#1a1a2e] rounded px-2 py-1 text-sm focus:border-[#00d4ff] outline-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <img src={urls.front} className="h-20 w-20 object-cover rounded border border-[#1a1a2e]" alt="front" />
              <span className="text-[9px] text-[#888]">FRONT</span>
            </div>
            <button
              onClick={() => onUpdatePair(swapPair(pair))}
              className="rounded border border-[#1a1a2e] hover:border-[#00d4ff] hover:text-[#00d4ff] px-2 py-1 text-sm"
              title="front/back 入れ替え"
            >⇄</button>
            <div className="flex flex-col items-center gap-1">
              <img src={urls.back} className="h-20 w-20 object-cover rounded border border-[#1a1a2e]" alt="back" />
              <span className="text-[9px] text-[#888]">BACK</span>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={onReanalyze} className="text-xs text-[#888] hover:text-[#00d4ff]" disabled={analyzing}>
              {analyzing ? '解析中…' : '再解析'}
            </button>
            <button onClick={onRemove} className="text-xs text-[#555] hover:text-[#ff3366]">削除</button>
          </div>
        </div>

        {/* Edit fields */}
        <div className="flex-1 min-w-0">
          {analyzing && !a && (
            <div className="text-xs text-[#00d4ff] py-8 text-center animate-pulse">解析中… (gemini-2.5-flash)</div>
          )}
          {analyzeError && (
            <div className="text-xs text-[#ff3366] py-8 text-center">解析エラー: {analyzeError}</div>
          )}
          {a && (
            <div className="space-y-3">
              {/* Row 1: Category + Color */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="カテゴリ" required>
                  <input type="text" value={a.category || ''} onChange={e => updateField(['category'], e.target.value)} className={inputCls(isUncertain(a.category))} />
                  {isUncertain(a.category) && ucBadge()}
                </Field>
                <Field label="サブタイプ">
                  <input type="text" value={a.subtype || ''} onChange={e => updateField(['subtype'], e.target.value)} className={inputCls(isUncertain(a.subtype))} />
                </Field>
                <Field label="主色 (name + hex)" required>
                  <div className="flex gap-1.5">
                    <input type="text" value={a.color_primary?.name || ''} onChange={e => updateField(['color_primary', 'name'], e.target.value)} className={inputCls(isUncertain(a.color_primary?.name))} placeholder="cream" />
                    <input type="color" value={a.color_primary?.hex?.startsWith('#') ? a.color_primary.hex : '#' + (a.color_primary?.hex || '000000')} onChange={e => updateField(['color_primary', 'hex'], e.target.value)} className="h-7 w-10 rounded border border-[#1a1a2e] bg-transparent cursor-pointer" />
                  </div>
                </Field>
              </div>

              {/* Row 2: Fabric */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="主素材" required>
                  <select value={a.fabric_primary?.material || 'unclear'} onChange={e => updateField(['fabric_primary', 'material'], e.target.value)} className={inputCls(isUncertain(a.fabric_primary?.material))}>
                    {FABRIC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {isUncertain(a.fabric_primary?.material) && ucBadge()}
                </Field>
                <Field label="生地重さ">
                  <select value={a.fabric_primary?.weight || 'medium'} onChange={e => updateField(['fabric_primary', 'weight'], e.target.value)} className={inputCls(false)}>
                    {['sheer', 'light', 'medium', 'heavy'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="副素材（コントラストがあれば）">
                  <select value={a.fabric_secondary?.material || ''} onChange={e => updateField(['fabric_secondary', 'material'], e.target.value)} className={inputCls(false)}>
                    <option value="">なし</option>
                    {FABRIC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 3: Neckline + Sleeve */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="首元 (front)" required>
                  <select value={a.neckline_or_collar_front || 'unclear'} onChange={e => updateField(['neckline_or_collar_front'], e.target.value)} className={inputCls(isUncertain(a.neckline_or_collar_front))}>
                    {NECKLINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="首元 (back)">
                  <select value={a.neckline_or_collar_back || 'unclear'} onChange={e => updateField(['neckline_or_collar_back'], e.target.value)} className={inputCls(isUncertain(a.neckline_or_collar_back))}>
                    {NECKLINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="袖タイプ" required>
                  <select value={a.sleeve_type || 'unclear'} onChange={e => updateField(['sleeve_type'], e.target.value)} className={inputCls(isUncertain(a.sleeve_type))}>
                    {SLEEVE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 4: Closure + Hardware */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="クロージャ" required>
                  <input type="text" value={a.closure_type_and_location || ''} onChange={e => updateField(['closure_type_and_location'], e.target.value)} className={inputCls(isUncertain(a.closure_type_and_location))} placeholder="center back invisible zipper" />
                </Field>
                <Field label="ボタン数">
                  <input type="number" value={a.buttons?.count ?? 0} onChange={e => updateField(['buttons', 'count'], parseInt(e.target.value, 10) || 0)} className={inputCls(false)} />
                </Field>
                <Field label="ボタン素材">
                  <input type="text" value={a.buttons?.material || ''} onChange={e => updateField(['buttons', 'material'], e.target.value)} className={inputCls(false)} placeholder="gold metal" />
                </Field>
              </div>

              {/* Row 5: Pocket + Pattern */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="ポケットtype">
                  <select
                    value={a.pockets?.[0]?.type || 'none'}
                    onChange={e => {
                      const t = e.target.value;
                      const next = (a.pockets && a.pockets.length > 0) ? [...a.pockets] : [{ type: '', location: '', count: 0, detail: '' }];
                      next[0] = { ...next[0], type: t === 'none' ? '' : t };
                      onUpdateAnalysis({ ...a, pockets: t === 'none' ? [] : next });
                    }}
                    className={inputCls(false)}
                  >
                    {POCKET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="柄あり?">
                  <select
                    value={a.pattern_or_print?.has ? 'yes' : 'no'}
                    onChange={e => updateField(['pattern_or_print', 'has'], e.target.value === 'yes')}
                    className={inputCls(false)}
                  >
                    <option value="no">solid (無地)</option>
                    <option value="yes">pattern (柄あり)</option>
                  </select>
                </Field>
                <Field label="柄説明（柄ありの場合）">
                  <input type="text" value={a.pattern_or_print?.description || ''} onChange={e => updateField(['pattern_or_print', 'description'], e.target.value)} className={inputCls(false)} placeholder="white floral on black" disabled={!a.pattern_or_print?.has} />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-[#888] mb-1">
        {label}{required && <span className="text-[#00d4ff] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls(uncertain: boolean): string {
  const base = 'w-full bg-[#0f0f14] border rounded px-2 py-1.5 text-xs focus:outline-none transition-colors';
  return uncertain
    ? `${base} border-[#ffb800]/50 focus:border-[#ffb800]`
    : `${base} border-[#1a1a2e] focus:border-[#00d4ff]`;
}
