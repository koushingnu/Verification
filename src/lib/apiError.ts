/**
 * FTPエラーの原因（タイムアウト/接続拒否/TLSエラーなど）を人間が読める形にする。
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return `${err.name}: ${err.message}${code ? ` (code: ${code})` : ""}`;
  }
  return String(err);
}

/**
 * 環境変数 DEBUG_API_ERRORS=1 のときのみ、エラー詳細をレスポンスに含めるためのフィールドを返す。
 * 原因調査が終わったら環境変数を無効化することを推奨する。
 */
export function debugErrorFields(err: unknown): { detail?: string } {
  if (process.env.DEBUG_API_ERRORS !== "1") return {};
  return { detail: describeError(err) };
}
