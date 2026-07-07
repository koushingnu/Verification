import { NextRequest, NextResponse } from "next/server";
import { getServerById } from "@/lib/servers";
import { browseDirectory, UnsafePathError } from "@/lib/ftp";
import { debugErrorFields } from "@/lib/apiError";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId") ?? "";
  const path = searchParams.get("path") ?? "";

  if (!serverId) {
    return NextResponse.json({ error: "serverId は必須です" }, { status: 400 });
  }

  const server = getServerById(serverId);
  if (!server) {
    return NextResponse.json({ error: "指定されたサーバーが見つかりません" }, { status: 404 });
  }

  try {
    const result = await browseDirectory(server, path);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return NextResponse.json({ error: "不正なパスが指定されました" }, { status: 400 });
    }
    console.error("[browse] failed", err);
    return NextResponse.json(
      { error: "フォルダの取得に失敗しました。サーバー接続情報をご確認ください。", ...debugErrorFields(err) },
      { status: 502 }
    );
  }
}
