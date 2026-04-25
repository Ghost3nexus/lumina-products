import type { SKUPair } from '../types';

/** Auto-pair files by sorted filename (consecutive pairs). */
export function autoPair(files: File[]): SKUPair[] {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const pairs: SKUPair[] = [];
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const front = sorted[i];
    const back = sorted[i + 1];
    pairs.push({
      id: `sku-${pairs.length + 1}-${Date.now()}-${i}`,
      sku: `sku-${String(pairs.length + 1).padStart(3, '0')}`,
      frontFile: front,
      backFile: back,
    });
  }
  return pairs;
}

/** Swap front and back of a pair. */
export function swapPair(pair: SKUPair): SKUPair {
  return { ...pair, frontFile: pair.backFile, backFile: pair.frontFile };
}

/** Rename a pair's SKU label. */
export function renamePair(pair: SKUPair, newSku: string): SKUPair {
  return { ...pair, sku: newSku };
}

export function objectURLForFile(file: File): string {
  return URL.createObjectURL(file);
}
