export const RINGS = ["ADOPT", "USE", "HOLD", "STOP", "DEPRECATED"] as const;
export type Ring = (typeof RINGS)[number];

export const QUADRANTS = ["Tools", "Frameworks", "UI", "Technology"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export interface Link {
  name: string;
  url: string;
}

export interface Related {
  id: string;
  title: string;
  quadrant: Quadrant;
  ring: Ring;
}

export interface ReleaseHistoryEntry {
  release: string;
  ring: Ring;
}

export interface Technology {
  id: string;
  title: string;
  label: string;
  description: string;
  reason: string;
  recommendation: string;
  support: string;
  quadrant: Quadrant;
  ring: Ring;
  trend?: string;
  since?: string;
  links: Link[];
  related: Related[];
  releaseHistory: ReleaseHistoryEntry[];
  lastChangedRelease: string | null;
}

export interface ChangeItem {
  id: string;
  title: string;
  quadrant: Quadrant;
  type: "new" | "moved" | "deprecated";
  previousRing: Ring | null;
  currentRing: Ring;
  reason: string;
}

export interface ReleaseData {
  date: string;
  entries: Technology[];
  changes: {
    previousRelease: string | null;
    items: ChangeItem[];
  };
}
