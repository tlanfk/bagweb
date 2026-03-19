import { MarkerDefinition, MapMeta } from "@/lib/types";

export const MAP_SIZE = 3072;

export const MAPS: MapMeta[] = [
  { id: "erangel", name: "에란겔", imageSrc: "/webp/Erangel.webp", width: MAP_SIZE, height: MAP_SIZE },
  { id: "miramar", name: "미라마", imageSrc: "/webp/Miramar.webp", width: MAP_SIZE, height: MAP_SIZE },
  { id: "taego", name: "태이고", imageSrc: "/webp/Taego.webp", width: MAP_SIZE, height: MAP_SIZE },
  { id: "deston", name: "데스턴", imageSrc: "/webp/Deston.webp", width: MAP_SIZE, height: MAP_SIZE },
  { id: "vikendi", name: "비켄디", imageSrc: "/webp/Vikendi.webp", width: MAP_SIZE, height: MAP_SIZE },
  { id: "rondo", name: "론도", imageSrc: "/webp/Rondo.webp", width: MAP_SIZE, height: MAP_SIZE },
];

export const MARKER_DEFINITIONS: MarkerDefinition[] = [
  { type: "car", label: "자동차", shortLabel: "CAR", iconSrc: "/vector/car.svg", color: "#f4c434" },
  { type: "boat", label: "배", shortLabel: "BOAT", iconSrc: "/vector/boat.svg", color: "#43c766" },
  { type: "gas", label: "주유소", shortLabel: "GAS", iconSrc: "/vector/gas.svg", color: "#f1c842" },
  { type: "plane", label: "글라이더", shortLabel: "GLD", iconSrc: "/vector/plane.svg", color: "#ef8d32" },
  { type: "garage", label: "차고", shortLabel: "GAR", iconSrc: "/vector/garage.svg", color: "#3d85f5" },
  { type: "key", label: "비밀방", shortLabel: "KEY", iconSrc: "/vector/key.svg", color: "#e64e4e" },
];
