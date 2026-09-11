export interface CategorySummaryResponse {
  id: number;
  name: string;
  color: string;
  count: number;
}

export type CategoryVideoPathMap = Record<string, string[]>;
