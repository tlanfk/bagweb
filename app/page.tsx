import { MapExperience } from "@/components/map-experience";
import { buildAccessContext, getSessionEmail } from "@/lib/admin-access";
import { loadMarkerCollection } from "@/lib/storage";
import { getViewerPreferences } from "@/lib/viewer-preferences";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [collection, preferences, email] = await Promise.all([
    loadMarkerCollection(),
    getViewerPreferences(),
    getSessionEmail(),
  ]);
  const access = buildAccessContext(email, collection.adminEmails);

  return (
    <MapExperience
      mode="viewer"
      initialCollection={{ ...collection, adminEmails: [] }}
      initialAccess={access}
      initialSelectedMapId={preferences.selectedMapId}
      initialIconBackgroundEnabled={preferences.iconBackgroundEnabled}
    />
  );
}
