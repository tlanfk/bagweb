import { MAP_SIZE } from "@/lib/maps";
import {
  MAP_IDS,
  MARKER_TYPES,
  MapId,
  MapMarkerGroups,
  MarkerCollection,
  MarkerPoint,
  MarkerType,
} from "@/lib/types";

export function createEmptyGroups(): MapMarkerGroups {
  return {
    car: [],
    boat: [],
    gas: [],
    plane: [],
    garage: [],
    key: [],
  };
}

export function createEmptyCollection(): MarkerCollection {
  const now = new Date().toISOString();

  return {
    version: 1,
    updatedAt: now,
    mapUpdatedAt: {
      erangel: now,
      miramar: now,
      taego: now,
      deston: now,
      vikendi: now,
      rondo: now,
    },
    adminEmails: [],
    maps: {
      erangel: createEmptyGroups(),
      miramar: createEmptyGroups(),
      taego: createEmptyGroups(),
      deston: createEmptyGroups(),
      vikendi: createEmptyGroups(),
      rondo: createEmptyGroups(),
    },
  };
}

export function cloneCollection(collection: MarkerCollection): MarkerCollection {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(collection);
  }

  return JSON.parse(JSON.stringify(collection)) as MarkerCollection;
}

export function makeMarkerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `marker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampCoordinate(value: number): number {
  return Math.max(0, Math.min(MAP_SIZE, Math.round(value)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMarker(marker: unknown): MarkerPoint | null {
  if (!isObject(marker)) {
    return null;
  }

  const x = Number(marker.x);
  const y = Number(marker.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    id: typeof marker.id === "string" && marker.id.length > 0 ? marker.id : makeMarkerId(),
    x: clampCoordinate(x),
    y: clampCoordinate(y),
  };
}

function normalizeGroups(rawGroups: unknown): MapMarkerGroups {
  const groups = createEmptyGroups();

  if (!isObject(rawGroups)) {
    return groups;
  }

  for (const type of MARKER_TYPES) {
    const rawList = rawGroups[type];

    if (!Array.isArray(rawList)) {
      continue;
    }

    groups[type] = rawList
      .map((item) => normalizeMarker(item))
      .filter((item): item is MarkerPoint => item !== null);
  }

  return groups;
}

export function normalizeMapGroups(input: unknown): MapMarkerGroups {
  return normalizeGroups(input);
}

export function cloneGroups(groups: MapMarkerGroups): MapMarkerGroups {
  return {
    car: [...groups.car],
    boat: [...groups.boat],
    gas: [...groups.gas],
    plane: [...groups.plane],
    garage: [...groups.garage],
    key: [...groups.key],
  };
}

export function areMapGroupsEqual(left: MapMarkerGroups, right: MapMarkerGroups): boolean {
  for (const type of MARKER_TYPES) {
    const leftList = left[type];
    const rightList = right[type];

    if (leftList.length !== rightList.length) {
      return false;
    }

    for (let index = 0; index < leftList.length; index += 1) {
      const leftMarker = leftList[index];
      const rightMarker = rightList[index];

      if (
        leftMarker?.id !== rightMarker?.id ||
        leftMarker?.x !== rightMarker?.x ||
        leftMarker?.y !== rightMarker?.y
      ) {
        return false;
      }
    }
  }

  return true;
}

function cloneCollectionForMap(collection: MarkerCollection, mapId: MapId): MarkerCollection {
  return {
    ...collection,
    mapUpdatedAt: {
      ...collection.mapUpdatedAt,
    },
    maps: {
      ...collection.maps,
      [mapId]: cloneGroups(collection.maps[mapId]),
    },
  };
}

export function normalizeMarkerCollection(input: unknown): MarkerCollection {
  const base = createEmptyCollection();

  if (!isObject(input)) {
    return base;
  }

  const maps = isObject(input.maps) ? input.maps : {};

  for (const mapId of MAP_IDS) {
    base.maps[mapId] = normalizeGroups(maps[mapId]);
  }

  base.version = Number.isFinite(Number(input.version)) ? Number(input.version) : 1;
  base.updatedAt =
    typeof input.updatedAt === "string" && input.updatedAt.length > 0
      ? input.updatedAt
      : new Date().toISOString();
  for (const mapId of MAP_IDS) {
    const rawUpdatedAt = isObject(input.mapUpdatedAt) ? input.mapUpdatedAt[mapId] : undefined;
    base.mapUpdatedAt[mapId] =
      typeof rawUpdatedAt === "string" && rawUpdatedAt.length > 0 ? rawUpdatedAt : base.updatedAt;
  }
  base.adminEmails = Array.isArray(input.adminEmails)
    ? input.adminEmails
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return base;
}

export function upsertMarker(
  collection: MarkerCollection,
  mapId: MapId,
  type: MarkerType,
  marker: MarkerPoint,
): MarkerCollection {
  const next = cloneCollectionForMap(collection, mapId);
  const list = next.maps[mapId][type];
  const index = list.findIndex((item) => item.id === marker.id);

  if (index >= 0) {
    list[index] = marker;
  } else {
    list.push(marker);
  }

  next.updatedAt = new Date().toISOString();
  next.mapUpdatedAt[mapId] = next.updatedAt;

  return next;
}

export function removeMarker(
  collection: MarkerCollection,
  mapId: MapId,
  type: MarkerType,
  markerId: string,
): MarkerCollection {
  const next = cloneCollectionForMap(collection, mapId);
  next.maps[mapId][type] = next.maps[mapId][type].filter((marker) => marker.id !== markerId);
  next.updatedAt = new Date().toISOString();
  next.mapUpdatedAt[mapId] = next.updatedAt;
  return next;
}

export function replaceMapGroups(
  collection: MarkerCollection,
  mapId: MapId,
  groups: MapMarkerGroups,
): MarkerCollection {
  const next = cloneCollectionForMap(collection, mapId);
  next.maps[mapId] = normalizeGroups(groups);
  next.updatedAt = new Date().toISOString();
  next.mapUpdatedAt[mapId] = next.updatedAt;
  return next;
}
