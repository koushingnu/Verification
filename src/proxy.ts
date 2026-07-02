import { NextRequest, NextResponse } from "next/server";

/**
 * 社内限定ツールのため、すべてのページ・APIにBasic認証をかける。
 * 認証情報が環境変数に設定されていない場合はフェイルクローズ（アクセス拒否）とする。
 */
export function proxy(request: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return new NextResponse(
      "サーバー設定エラー: 環境変数 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が設定されていません。管理者に連絡してください。",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice("Basic ".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    const suppliedPassword = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

    if (suppliedUser === expectedUser && suppliedPassword === expectedPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
