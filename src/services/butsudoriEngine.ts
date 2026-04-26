/**
 * butsudoriEngine.ts — analyze (gemini-2.5-flash) → generate (gemini-3.1-flash-image-preview)
 * Browser TypeScript port of test/butsudori-poc/batch.mjs from Lumina Fashion Studio.
 */

import { GoogleGenAI } from '@google/genai';
import type { GarmentAnalysis, OutputMode, SKUPair, SKUResult } from '../types';

const ANALYZE_PROMPT = `Fashion garment analyst. Analyze 2 iPhone flat-lay overhead photos of a SINGLE garment.
Image #1 = FRONT side up. Image #2 = BACK side up.

Extract ACTUAL construction. NO invention. If unclear, write "unclear".

Return STRICT JSON:
{
  "category":"","subtype":"",
  "color_primary":{"name":"","hex":""},
  "color_secondary":{"name":"","hex":"","used_for":""},
  "fabric_primary":{"material":"","weight":"","finish":"","weave_or_knit_pattern":""},
  "fabric_secondary":{"material":"","used_for":"","finish":""},
  "silhouette":"","fit":"","length":"",
  "neckline_or_collar_front":"","neckline_or_collar_back":"",
  "sleeve_type":"","sleeve_details":"","has_shoulder_straps":false,"cuff_detail":"",
  "closure_type_and_location":"",
  "buttons":{"count":0,"shape":"","material":"","size":"","positions":[]},
  "buckles":{"count":0,"shape":"","material":"","positions":[]},
  "zippers":{"count":0,"positions":[],"color":""},
  "pockets":[{"type":"","location":"","count":0,"detail":""}],
  "stitching":{"color":"","type":"","visibility":""},
  "seams_and_panels":[],
  "wash_or_surface_treatment":"",
  "pattern_or_print":{"has":false,"description":"","scale":"","placement":""},
  "front_summary_for_generation":"","back_summary_for_generation":"",
  "visible_hardware_details":"","known_ambiguities":[]
}`;

function structuralFacts(a: GarmentAnalysis): string {
  return `
GARMENT STRUCTURAL FACTS (from vision analysis — reproduce EXACTLY, do NOT invent):
- Category: ${a.category} / ${a.subtype}
- Primary color: ${a.color_primary?.name} (${a.color_primary?.hex})${a.color_secondary?.name ? ` · Secondary: ${a.color_secondary.name} ${a.color_secondary.hex} (${a.color_secondary.used_for})` : ''}
- Fabric primary: ${a.fabric_primary?.material}, ${a.fabric_primary?.weight} weight, ${a.fabric_primary?.finish}, weave/knit: ${a.fabric_primary?.weave_or_knit_pattern}
${a.fabric_secondary?.material ? `- Fabric secondary: ${a.fabric_secondary.material} (used for ${a.fabric_secondary.used_for}, ${a.fabric_secondary.finish})` : ''}
- Silhouette / fit / length: ${a.silhouette} / ${a.fit} / ${a.length}
- Neckline or collar: front=${a.neckline_or_collar_front} · back=${a.neckline_or_collar_back}
- Sleeve: ${a.sleeve_type} · ${a.sleeve_details}
- Cuff: ${a.cuff_detail || 'none'}
- Shoulder straps: ${a.has_shoulder_straps ? 'YES' : 'NO — standard armhole or set-in sleeve'}
- Closure: ${a.closure_type_and_location}
- Buttons: ${a.buttons?.count || 0} × ${a.buttons?.shape} ${a.buttons?.material} (${a.buttons?.size}) at ${(a.buttons?.positions || []).join(' / ')}
- Buckles: ${a.buckles?.count || 0} × ${a.buckles?.shape} ${a.buckles?.material} at ${(a.buckles?.positions || []).join(' / ')}
- Zippers: ${a.zippers?.count || 0} (${a.zippers?.color}) at ${(a.zippers?.positions || []).join(' / ')}
- Pockets: ${(a.pockets || []).map(p => `${p.count}× ${p.type} at ${p.location} (${p.detail})`).join(' · ') || 'none'}
- Stitching: ${a.stitching?.color} ${a.stitching?.type}, ${a.stitching?.visibility}
- Wash / surface: ${a.wash_or_surface_treatment || 'none'}
- Pattern/print: ${a.pattern_or_print?.has ? `YES — ${a.pattern_or_print.description}, scale: ${a.pattern_or_print.scale}, placement: ${a.pattern_or_print.placement}` : 'solid, no print'}
- Seams/panels: ${(a.seams_and_panels || []).join(' · ')}`.trim();
}

const GM_VIEW: Record<string, string> = {
  front: `FRONT VIEW. Ghost mannequin — garment worn on invisible body, straight-on front view. Reproduce the front construction shown in Image #1 reference EXACTLY.`,
  back:  `BACK VIEW. Ghost mannequin — garment from behind. Reproduce the back construction shown in Image #2 reference EXACTLY (NO front pockets if back, wash pattern continuous).`,
  side:  `3/4 ANGLE VIEW. Ghost mannequin — 45 degree side profile. Maintain SAME garment as front anchor. Same button count, same pocket type as analysis.`,
  detail:`MACRO DETAIL CLOSE-UP of the most distinctive hardware/detail. Fill 60% of frame with the detail. Preserve exact hardware count, shape, material per analysis. Photoreal.`,
};

const GM_REQ = `
RENDERING REQUIREMENTS:
- HIGH-END E-COMMERCE GHOST MANNEQUIN photography. Benchmark: MR PORTER / NET-A-PORTER / UNIQLO.
- Pure white (#FFFFFF) seamless studio background.
- Soft directional studio lighting, shadow ratio ~1:2.5.
- Fabric texture and weave MUST be visible (no plastic).
- Color fidelity: match primary color hex exactly. No drift.
- Garment holds full 3D body shape — NO visible mannequin/person/hanger.
- 3:4 portrait orientation.

HARD NEGATIVES:
- NO flat-lay appearance · NO mannequin/body/hanger visible
- NO invented hardware · button count MUST match analysis
- NO added shoulder straps if analysis says NO
- NO smoothed/plastic fabric · weave must be visible
- NO color drift · NO blown highlights · NO flat lighting`.trim();

const FL_BASE = `Editorial flat-lay product photography in the style of Miu Miu and MaxMara e-commerce.

Render the garment as a top-down flat-lay still life:
- Garment laid flat on pure white (#FFFFFF) seamless surface, photographed directly overhead.
- All wrinkles, creases, fold marks REMOVED — garment looks freshly steamed.
- ALL environmental elements REMOVED — no floor texture, no shadows of room, no fixtures.
- Soft even overhead lighting, gentle natural shadow only directly under fabric edges.
- Generous white space — garment occupies center 70% of frame.
- Fabric texture and weave clearly visible.
- Color preserved exactly per reference.
- 3:4 portrait orientation.`;

const FL_NEG = `
HARD NEGATIVES:
- NO floor / NO concrete texture / NO room visible / NO environment shadows
- NO wrinkles / NO creases / NO fold marks
- NO 3D body shape (this is FLAT-LAY, not ghost mannequin)
- NO color drift / NO blown highlights / NO heavy shadows
- NO mannequin / NO body / NO hanger
- NO invented hardware · count MUST match analysis`.trim();

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(',');
      resolve(dataUrl.slice(comma + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export class ButsudoriEngine {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async callGen(prompt: string, refs: Array<{ label: string; data: string }>): Promise<string | null> {
    const parts: any[] = [{ text: prompt }];
    for (const r of refs) {
      parts.push({ text: r.label });
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: r.data } });
    }
    const resp = await this.ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['TEXT', 'IMAGE'], temperature: 0.4 },
    });
    for (const part of resp.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  }

  async analyze(frontB64: string, backB64: string): Promise<GarmentAnalysis> {
    const resp = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: ANALYZE_PROMPT },
          { text: '[IMAGE #1 — FRONT flat-lay]:' },
          { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
          { text: '[IMAGE #2 — BACK flat-lay]:' },
          { inlineData: { mimeType: 'image/jpeg', data: backB64 } },
        ],
      }],
      config: { temperature: 0.1, responseMimeType: 'application/json' },
    });
    const text = resp.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return JSON.parse(text);
  }

  async genGM(analysis: GarmentAnalysis, view: 'front'|'back'|'side'|'detail', frontB64: string, backB64: string): Promise<string | null> {
    const prompt = `${GM_VIEW[view]}\n\n${structuralFacts(analysis)}\n\n${GM_REQ}`;
    return this.callGen(prompt, [
      { label: '[IMAGE #1 — FRONT reference]:', data: frontB64 },
      { label: '[IMAGE #2 — BACK reference]:', data: backB64 },
    ]);
  }

  async genFlatlayFront(analysis: GarmentAnalysis, frontB64: string): Promise<string | null> {
    const prompt = `${FL_BASE}\n\n${structuralFacts(analysis)}\n\n${FL_NEG}\n\nPRIMARY TASK: TRANSFORM Image #1 (the actual iPhone flat-lay FRONT photo) into clean editorial Miu Miu/MaxMara flat-lay style.

Image #1 IS the source of truth for:
- Exact garment structure, sleeve angles, body shape, layer order at shoulders
- All visible seams, panels, hardware positions, sleeve overlap with body
- The exact pose as the photographer arranged it

Your only changes to Image #1:
- Remove the messy floor/environment background → pure white seamless
- Smooth flat-lay wrinkles → freshly steamed appearance
- Normalize lighting → soft even editorial top-down
- Preserve ALL geometry, layer order, sleeve angle, seam visibility exactly as in Image #1

DO NOT re-pose the garment. DO NOT change layer order. DO NOT invent details not in Image #1.`;
    return this.callGen(prompt, [
      { label: '[IMAGE #1 — FRONT REFERENCE (PRIMARY SOURCE OF TRUTH — actual iPhone flat-lay of the FRONT side. Reproduce structure, sleeve angle, layer order — only clean up background and wrinkles)]:', data: frontB64 },
    ]);
  }

  async genFlatlayBack(analysis: GarmentAnalysis, frontAnchorB64: string, backRefB64: string): Promise<string | null> {
    const prompt = `${FL_BASE}\n\n${structuralFacts(analysis)}\n\n${FL_NEG}\n\nPRIMARY TASK: TRANSFORM Image #1 (the actual iPhone flat-lay BACK photo) into clean editorial Miu Miu/MaxMara flat-lay style.

Image #1 IS the source of truth for:
- The exact garment structure (sleeve attachment, body shape, neckline, closures)
- The exact LAYER ORDER at shoulders (sleeves overlapping back body where they attach — preserve this exactly as shown)
- The exact sleeve angle/position as the photographer arranged it
- All visible seams, panels, hardware positions

Your only changes to Image #1:
- Remove the messy floor/environment background → pure white seamless
- Smooth out flat-lay wrinkles and fold marks → freshly steamed appearance
- Normalize lighting → soft even editorial top-down
- Preserve ALL geometry, layer order, sleeve overlap, seam visibility exactly as in Image #1

DO NOT re-pose. DO NOT change layer order. DO NOT invent details not in Image #1.

Image #2 is provided ONLY for style/scale matching with the paired front output (color tone, white space ratio, image scale).`;
    return this.callGen(prompt, [
      { label: '[IMAGE #1 — BACK REFERENCE (PRIMARY SOURCE OF TRUTH — actual iPhone flat-lay of the BACK side. Reproduce its exact structure, sleeve overlap, layer order — only clean up background and wrinkles)]:', data: backRefB64 },
      { label: '[IMAGE #2 — paired FRONT output for style coherence (match scale, white-space ratio, color tone for the paired set)]:', data: frontAnchorB64 },
    ]);
  }
}

function dataUrlToBase64(dataUrl: string): string {
  const c = dataUrl.indexOf(',');
  return c >= 0 ? dataUrl.slice(c + 1) : dataUrl;
}

export { fileToBase64, dataUrlToBase64 };

export async function analyzePair(engine: ButsudoriEngine, pair: SKUPair): Promise<GarmentAnalysis> {
  const [frontB64, backB64] = await Promise.all([fileToBase64(pair.frontFile), fileToBase64(pair.backFile)]);
  return engine.analyze(frontB64, backB64);
}

export async function generateForSKU(
  engine: ButsudoriEngine,
  pair: SKUPair,
  analysis: GarmentAnalysis,
  mode: OutputMode,
  onUpdate: (partial: Partial<SKUResult>) => void,
): Promise<SKUResult> {
  const result: SKUResult = { pair, status: 'generating', progress: 15, outputs: {}, analysis, startedAt: Date.now() };
  onUpdate({ status: 'generating', progress: 15, message: '生成開始', analysis });

  try {
    const [frontB64, backB64] = await Promise.all([fileToBase64(pair.frontFile), fileToBase64(pair.backFile)]);

    const wantGM = mode === 'ghost-mannequin' || mode === 'both';
    const wantFL = mode === 'flatlay' || mode === 'both';
    const totalSteps = (wantGM ? 4 : 0) + (wantFL ? 2 : 0);
    let stepsDone = 0;
    const tick = () => { stepsDone++; onUpdate({ progress: 15 + Math.round((stepsDone / totalSteps) * 80) }); };

    if (wantGM) {
      for (const view of ['front', 'back', 'side', 'detail'] as const) {
        const out = await engine.genGM(analysis, view, frontB64, backB64);
        if (out) {
          const key = ('gm' + view.charAt(0).toUpperCase() + view.slice(1)) as 'gmFront'|'gmBack'|'gmSide'|'gmDetail';
          result.outputs[key] = out;
          onUpdate({ outputs: { ...result.outputs }, message: `${view} 完了` });
        }
        tick();
      }
    }

    if (wantFL) {
      const flFront = await engine.genFlatlayFront(analysis, frontB64);
      if (flFront) {
        result.outputs.flatlayFront = flFront;
        onUpdate({ outputs: { ...result.outputs }, message: 'flat-lay front 完了' });
      }
      tick();
      if (flFront) {
        const flBack = await engine.genFlatlayBack(analysis, dataUrlToBase64(flFront), backB64);
        if (flBack) {
          result.outputs.flatlayBack = flBack;
          onUpdate({ outputs: { ...result.outputs }, message: 'flat-lay back 完了' });
        }
      }
      tick();
    }

    result.status = 'done'; result.progress = 100; result.finishedAt = Date.now();
    onUpdate({ status: 'done', progress: 100, message: '完了', finishedAt: result.finishedAt });
  } catch (e: any) {
    result.status = 'error'; result.error = e?.message || String(e); result.finishedAt = Date.now();
    onUpdate({ status: 'error', error: result.error, finishedAt: result.finishedAt });
  }
  return result;
}

/** Run analyze across pairs with concurrency. Calls onAnalyzed per SKU as ready. */
export async function batchAnalyze(
  apiKey: string,
  pairs: SKUPair[],
  concurrency: number,
  onAnalyzed: (skuId: string, analysis: GarmentAnalysis | null, error?: string) => void,
): Promise<void> {
  const engine = new ButsudoriEngine(apiKey);
  const queue = [...pairs];
  const inFlight = new Set<Promise<void>>();

  const next = async () => {
    while (queue.length || inFlight.size) {
      while (queue.length && inFlight.size < concurrency) {
        const p = queue.shift()!;
        const task = (async () => {
          try {
            const a = await analyzePair(engine, p);
            onAnalyzed(p.id, a);
          } catch (e: any) {
            onAnalyzed(p.id, null, e?.message || String(e));
          }
        })();
        const wrap = task.finally(() => inFlight.delete(wrap));
        inFlight.add(wrap);
      }
      if (inFlight.size) await Promise.race(inFlight);
    }
  };
  await next();
}

/** Run generation across pairs using pre-computed (possibly edited) analyses. */
export async function batchGenerate(
  apiKey: string,
  pairs: SKUPair[],
  analyses: Record<string, GarmentAnalysis>,
  mode: OutputMode,
  concurrency: number,
  onUpdate: (skuId: string, partial: Partial<SKUResult>) => void,
): Promise<void> {
  const engine = new ButsudoriEngine(apiKey);
  const queue = [...pairs];
  const inFlight = new Set<Promise<void>>();

  const next = async () => {
    while (queue.length || inFlight.size) {
      while (queue.length && inFlight.size < concurrency) {
        const p = queue.shift()!;
        const a = analyses[p.id];
        if (!a) {
          onUpdate(p.id, { status: 'error', error: '解析データなし — analyze を先に実行してください' });
          continue;
        }
        const task = (async () => {
          await generateForSKU(engine, p, a, mode, partial => onUpdate(p.id, partial));
        })();
        const wrap = task.finally(() => inFlight.delete(wrap));
        inFlight.add(wrap);
      }
      if (inFlight.size) await Promise.race(inFlight);
    }
  };
  await next();
}
