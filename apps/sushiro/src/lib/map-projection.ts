import type { QueueStore } from "@/lib/queues";

// Original MapSVG calibration. See public/HONG-KONG-MAP-MODIFICATION.txt.
const west = 113.834541;
const east = 114.441018;
const north = 22.562136;
const sourceWidth = 612.52246;
const viewBoxWidth = 613;
const viewBoxHeight = 445;
const radians = Math.PI / 180;
const mercatorScale = sourceWidth / ((east - west) * radians);

function mercatorY(latitude: number) {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * radians) / 2));
}

const northY = mercatorY(north);

export function projectMapLocation({
  latitude,
  longitude,
}: Pick<QueueStore, "latitude" | "longitude">) {
  return {
    x: (((longitude - west) / (east - west)) * sourceWidth * 100) / viewBoxWidth,
    y: ((northY - mercatorY(latitude)) * mercatorScale * 100) / viewBoxHeight,
  };
}
