import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isSuperAdminEmail, normalizeEmails } from "@/lib/admin-emails";
import { loadMarkerCollection, saveAdminEmails } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!isSuperAdminEmail(email)) {
    return NextResponse.json({ message: "최종 관리자만 권한 이메일을 수정할 수 있습니다." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { adminEmails?: string[] };
    const collection = await loadMarkerCollection();
    const saved = await saveAdminEmails(
      collection,
      normalizeEmails(Array.isArray(body.adminEmails) ? body.adminEmails : []),
    );
    return NextResponse.json({ adminEmails: saved.adminEmails });
  } catch (error) {
    const message = error instanceof Error ? error.message : "권한 이메일 저장 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
