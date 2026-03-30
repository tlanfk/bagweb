import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import {
  createEmptyCollection,
  normalizeMapGroups,
  normalizeMarkerCollection,
  replaceMapGroups,
} from "@/lib/markers";
import { MAP_IDS, MapId, MapMarkerGroups, MarkerCollection, StorageMode } from "@/lib/types";

const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "markers.json");
const LEGACY_BLOB_PATHNAME = "pubg-map-editor/markers.json";
const COLLECTION_META_BLOB_PATHNAME = "pubg-map-editor/meta.json";

interface MarkerCollectionMetadata {
  version: number;
  updatedAt: string;
  mapUpdatedAt: MarkerCollection["mapUpdatedAt"];
  adminEmails: string[];
}

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file";
}

function getMapBlobPathname(mapId: MapId): string {
  return `pubg-map-editor/maps/${mapId}.json`;
}

function toMetadata(collection: MarkerCollection): MarkerCollectionMetadata {
  return {
    version: collection.version,
    updatedAt: collection.updatedAt,
    mapUpdatedAt: collection.mapUpdatedAt,
    adminEmails: collection.adminEmails,
  };
}

function normalizeMetadata(input: unknown): MarkerCollectionMetadata {
  const normalized = normalizeMarkerCollection({
    ...(typeof input === "object" && input !== null ? input : {}),
    maps: {},
  });

  return toMetadata(normalized);
}

async function loadFromLocalFile(): Promise<MarkerCollection> {
  try {
    const raw = await readFile(LOCAL_DATA_FILE, "utf8");
    return normalizeMarkerCollection(JSON.parse(raw));
  } catch {
    return createEmptyCollection();
  }
}

async function saveToLocalFile(collection: MarkerCollection): Promise<void> {
  await mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await writeFile(LOCAL_DATA_FILE, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
}

async function loadBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200) {
      return null;
    }

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }

    throw error;
  }
}

async function saveBlobJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function loadLegacyBlob(): Promise<MarkerCollection | null> {
  const legacy = await loadBlobJson<unknown>(LEGACY_BLOB_PATHNAME);
  return legacy ? normalizeMarkerCollection(legacy) : null;
}

async function loadSplitBlob(): Promise<MarkerCollection | null> {
  const rawMetadata = await loadBlobJson<unknown>(COLLECTION_META_BLOB_PATHNAME);

  if (!rawMetadata) {
    return null;
  }

  const metadata = normalizeMetadata(rawMetadata);
  const mapEntries = await Promise.all(
    MAP_IDS.map(async (mapId): Promise<[MapId, unknown | null]> => {
      const splitGroups = await loadBlobJson<unknown>(getMapBlobPathname(mapId));
      return [mapId, splitGroups];
    }),
  );
  const hasMissingSplitMaps = mapEntries.some(([, splitGroups]) => splitGroups === null);
  const legacy = hasMissingSplitMaps ? await loadLegacyBlob() : null;
  const maps = Object.fromEntries(
    mapEntries.map(([mapId, splitGroups]) => [
      mapId,
      splitGroups ? normalizeMapGroups(splitGroups) : legacy?.maps[mapId] ?? normalizeMapGroups(null),
    ]),
  ) as MarkerCollection["maps"];

  return normalizeMarkerCollection({
    ...metadata,
    maps,
  });
}

async function loadFromBlob(): Promise<MarkerCollection> {
  const split = await loadSplitBlob();

  if (split) {
    return split;
  }

  return (await loadLegacyBlob()) ?? createEmptyCollection();
}

async function saveAllToBlob(collection: MarkerCollection): Promise<void> {
  await saveBlobJson(COLLECTION_META_BLOB_PATHNAME, toMetadata(collection));
  await Promise.all(
    MAP_IDS.map((mapId) => saveBlobJson(getMapBlobPathname(mapId), collection.maps[mapId])),
  );
}

async function saveMapToBlob(collection: MarkerCollection, mapId: MapId): Promise<void> {
  await Promise.all([
    saveBlobJson(COLLECTION_META_BLOB_PATHNAME, toMetadata(collection)),
    saveBlobJson(getMapBlobPathname(mapId), collection.maps[mapId]),
  ]);
}

async function saveMetadataToBlob(collection: MarkerCollection): Promise<void> {
  await saveBlobJson(COLLECTION_META_BLOB_PATHNAME, toMetadata(collection));
}

export async function loadMarkerCollection(): Promise<MarkerCollection> {
  if (getStorageMode() === "blob") {
    return loadFromBlob();
  }

  return loadFromLocalFile();
}

export async function saveMarkerCollection(collection: MarkerCollection): Promise<MarkerCollection> {
  const normalized = normalizeMarkerCollection(collection);

  if (getStorageMode() === "blob") {
    await saveAllToBlob(normalized);
    return normalized;
  }

  await saveToLocalFile(normalized);
  return normalized;
}

export async function saveMapGroups(
  collection: MarkerCollection,
  mapId: MapId,
  groups: MapMarkerGroups,
): Promise<MarkerCollection> {
  const normalized = normalizeMarkerCollection(replaceMapGroups(collection, mapId, groups));

  if (getStorageMode() === "blob") {
    await saveMapToBlob(normalized, mapId);
    return normalized;
  }

  await saveToLocalFile(normalized);
  return normalized;
}

export async function saveAdminEmails(
  collection: MarkerCollection,
  adminEmails: string[],
): Promise<MarkerCollection> {
  const normalized = normalizeMarkerCollection({
    ...collection,
    updatedAt: new Date().toISOString(),
    adminEmails,
  });

  if (getStorageMode() === "blob") {
    await saveMetadataToBlob(normalized);
    return normalized;
  }

  await saveToLocalFile(normalized);
  return normalized;
}
