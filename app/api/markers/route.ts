import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { replaceMapGroups } from "@/lib/markers";
import { loadMarkerCollection, saveMarkerCollection } from "@/lib/storage";
import { MapId, MapMarkerGroups } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadMarkerCollection();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!(await isAllowedAdminEmail(session?.user?.email))) {
    return NextResponse.json({ message: "관리자만 저장할 수 있습니다." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      mapId?: MapId;
      groups?: MapMarkerGroups;
      lastKnownUpdatedAt?: string;
    };

    if (!body.mapId || !body.groups || typeof body.lastKnownUpdatedAt !== "string") {
      return NextResponse.json({ message: "잘못된 저장 요청입니다." }, { status: 400 });
    }

    const current = await loadMarkerCollection();

    if (current.mapUpdatedAt[body.mapId] !== body.lastKnownUpdatedAt) {
      return NextResponse.json(
        {
          message: "다른 관리자가 이 맵을 먼저 저장했습니다. 새로고침 후 다시 편집해 주세요.",
        },
        { status: 409 },
      );
    }

    const nextCollection = replaceMapGroups(current, body.mapId, body.groups);
    const saved = await saveMarkerCollection(nextCollection);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
