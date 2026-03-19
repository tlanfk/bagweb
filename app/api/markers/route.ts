import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { normalizeMarkerCollection } from "@/lib/markers";
import { loadMarkerCollection, saveMarkerCollection } from "@/lib/storage";

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
    const body = await request.json();
    const saved = await saveMarkerCollection(normalizeMarkerCollection(body));
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
