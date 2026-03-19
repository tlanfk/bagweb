import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { createEmptyCollection, normalizeMarkerCollection } from "@/lib/markers";
import { MarkerCollection, StorageMode } from "@/lib/types";

const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "markers.json");
const BLOB_PATHNAME = "pubg-map-editor/markers.json";

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file";
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

async function loadFromBlob(): Promise<MarkerCollection> {
  const result = await get(BLOB_PATHNAME, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    return createEmptyCollection();
  }

  const text = await new Response(result.stream).text();

  return normalizeMarkerCollection(JSON.parse(text));
}

async function saveToBlob(collection: MarkerCollection): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(collection, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function loadMarkerCollection(): Promise<MarkerCollection> {
  if (getStorageMode() === "blob") {
    try {
      return await loadFromBlob();
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return createEmptyCollection();
      }

      throw error;
    }
  }

  return loadFromLocalFile();
}

export async function saveMarkerCollection(collection: MarkerCollection): Promise<MarkerCollection> {
  const normalized = normalizeMarkerCollection(collection);

  if (getStorageMode() === "blob") {
    await saveToBlob(normalized);
    return normalized;
  }

  await saveToLocalFile(normalized);
  return normalized;
}
