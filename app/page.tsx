import { MapExperience } from "@/components/map-experience";
import { getServerAccessContext } from "@/lib/admin-access";
import { loadMarkerCollection } from "@/lib/storage";
import { getViewerPreferences } from "@/lib/viewer-preferences";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [collection, access, preferences] = await Promise.all([
    loadMarkerCollection(),
    getServerAccessContext(),
    getViewerPreferences(),
  ]);

  return (
    <MapExperience
      mode="viewer"
      initialCollection={collection}
      initialAccess={access}
      initialSelectedMapId={preferences.selectedMapId}
      initialIconBackgroundEnabled={preferences.iconBackgroundEnabled}
    />
  );
}
