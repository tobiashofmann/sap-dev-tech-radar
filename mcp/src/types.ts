export const RINGS = ["ADOPT", "USE", "HOLD", "STOP", "DEPRECATED"] as const;
export type Ring = (typeof RINGS)[number];

export const QUADRANTS = ["Tools", "Frameworks", "UI", "Technology"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export interface Technology {
  title: string;
  description: string;
  reason: string;
  support: string;
  links: Record<string, string>;
  label: string;
  ring: Ring;
  quadrant: Quadrant;
  active: boolean;
  moved: number;
  trend?: string;
  since?: string;
  link: string;
}
