import { MapExperience } from "@/components/map-experience";
import { getServerAccessContext } from "@/lib/admin-access";
import { loadMarkerCollection } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [collection, access] = await Promise.all([loadMarkerCollection(), getServerAccessContext()]);

  return <MapExperience mode="admin" initialCollection={collection} initialAccess={access} />;
}
