import { cookies } from "next/headers";
import { MAP_IDS, MapId } from "@/lib/types";
import {
  ICON_BACKGROUND_COOKIE_KEY,
  SELECTED_MAP_COOKIE_KEY,
} from "@/lib/viewer-preference-keys";

export interface ViewerPreferences {
  selectedMapId: MapId;
  iconBackgroundEnabled: boolean;
}

function parseMapId(value: string | undefined): MapId {
  if (value && MAP_IDS.includes(value as MapId)) {
    return value as MapId;
  }

  return "erangel";
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

export async function getViewerPreferences(): Promise<ViewerPreferences> {
  const store = await cookies();

  return {
    selectedMapId: parseMapId(store.get(SELECTED_MAP_COOKIE_KEY)?.value),
    iconBackgroundEnabled: parseBoolean(store.get(ICON_BACKGROUND_COOKIE_KEY)?.value, true),
  };
}
