import { MapExperience } from "@/components/map-experience";
import { getServerAccessContext } from "@/lib/admin-access";
import { loadMarkerCollection } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [collection, access] = await Promise.all([loadMarkerCollection(), getServerAccessContext()]);

  return <MapExperience mode="viewer" initialCollection={collection} initialAccess={access} />;
}
