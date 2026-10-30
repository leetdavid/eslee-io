import type { Era } from "../engine/types";

// Each era globe is turned to suit its era; pins use the same projection.
export const GLOBES: Record<Era, { size: number; r: number; rotate: [number, number, number] }> = {
  engraved: { size: 240, r: 110, rotate: [-62, -36, 0] },
  imperial: { size: 240, r: 110, rotate: [-70, -26, 0] },
  interwar: { size: 240, r: 110, rotate: [-52, -36, 0] },
  mid: { size: 260, r: 120, rotate: [-50, -18, 0] },
  web: { size: 240, r: 110, rotate: [-30, -22, 0] },
};
