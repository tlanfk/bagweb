export const MAP_IDS = [
  "erangel",
  "miramar",
  "taego",
  "deston",
  "vikendi",
  "rondo",
] as const;

export const MARKER_TYPES = [
  "car",
  "boat",
  "gas",
  "plane",
  "garage",
  "key",
] as const;

export type MapId = (typeof MAP_IDS)[number];
export type MarkerType = (typeof MARKER_TYPES)[number];

export interface MapMeta {
  id: MapId;
  name: string;
  imageSrc: string;
  width: number;
  height: number;
}

export interface MarkerDefinition {
  type: MarkerType;
  label: string;
  shortLabel: string;
  iconSrc: string;
  color: string;
}

export interface MarkerPoint {
  id: string;
  x: number;
  y: number;
}

export type MapMarkerGroups = Record<MarkerType, MarkerPoint[]>;

export interface MarkerCollection {
  version: number;
  updatedAt: string;
  mapUpdatedAt: Record<MapId, string>;
  adminEmails: string[];
  maps: Record<MapId, MapMarkerGroups>;
}

export type StorageMode = "blob" | "file";
