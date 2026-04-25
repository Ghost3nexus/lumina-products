export type OutputMode = 'flatlay' | 'ghost-mannequin' | 'both';

export interface SKUPair {
  id: string;
  sku: string;
  frontFile: File;
  backFile: File;
}

export interface GarmentAnalysis {
  category?: string;
  subtype?: string;
  color_primary?: { name?: string; hex?: string };
  color_secondary?: { name?: string; hex?: string; used_for?: string };
  fabric_primary?: { material?: string; weight?: string; finish?: string; weave_or_knit_pattern?: string };
  fabric_secondary?: { material?: string; used_for?: string; finish?: string };
  silhouette?: string;
  fit?: string;
  length?: string;
  neckline_or_collar_front?: string;
  neckline_or_collar_back?: string;
  sleeve_type?: string;
  sleeve_details?: string;
  has_shoulder_straps?: boolean;
  cuff_detail?: string;
  closure_type_and_location?: string;
  buttons?: { count?: number; shape?: string; material?: string; size?: string; positions?: string[] };
  buckles?: { count?: number; shape?: string; material?: string; positions?: string[] };
  zippers?: { count?: number; positions?: string[]; color?: string };
  pockets?: Array<{ type?: string; location?: string; count?: number; detail?: string }>;
  stitching?: { color?: string; type?: string; visibility?: string };
  seams_and_panels?: string[];
  wash_or_surface_treatment?: string;
  pattern_or_print?: { has?: boolean; description?: string; scale?: string; placement?: string };
  front_summary_for_generation?: string;
  back_summary_for_generation?: string;
  visible_hardware_details?: string;
  known_ambiguities?: string[];
}

export type SKUStatus = 'pending' | 'analyzing' | 'generating' | 'done' | 'error';

export interface SKUResult {
  pair: SKUPair;
  status: SKUStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
  analysis?: GarmentAnalysis;
  outputs: {
    flatlayFront?: string; // data URL
    flatlayBack?: string;
    gmFront?: string;
    gmBack?: string;
    gmSide?: string;
    gmDetail?: string;
  };
  startedAt?: number;
  finishedAt?: number;
}
