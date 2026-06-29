export interface SLFResult {
  success: boolean;
  data: SLFData[] | null;
}

export interface SLFData {
  timeMs: number;
  timestamp: string;
  text: string;
}
