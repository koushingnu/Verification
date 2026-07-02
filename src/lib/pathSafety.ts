import path from "node:path";

/**
 * 画像として配信を許可する拡張子。
 * ここに無い拡張子は検索結果にも画像配信APIにも出さない。
 */
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
]);

export function isImagePath(filePath: string): boolean {
  const ext = path.posix.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * ユーザー入力の相対パスを正規化し、ベースディレクトリの外に出られないようにする。
 *
 * 先頭に "/" を付けてから normalize することで、".." がルートを超えられなくなる
 * （Node.js の path.posix.normalize は "/../foo" を "/foo" に丸める）。
 * これにより意図的な "../../etc/passwd" のようなパストラバーサル攻撃を防ぐ。
 */
export function sanitizeRelativePath(rawPath: string): string | null {
  if (typeof rawPath !== "string") return null;
  if (rawPath.includes("\0")) return null;

  const normalized = path.posix.normalize(`/${rawPath}`);
  if (normalized === "/") return "";

  const relative = normalized.replace(/^\/+/, "");
  // normalize後に再度 ".." が含まれることは無いはずだが、念のため二重チェック。
  if (relative.split("/").includes("..")) return null;

  return relative;
}

/**
 * ベースディレクトリ配下の絶対パス（FTPサーバー上のパス）を安全に組み立てる。
 * 不正なパスの場合は null を返す。
 */
export function resolveSafePath(baseDir: string, rawRelativePath: string): string | null {
  const safeRelative = sanitizeRelativePath(rawRelativePath);
  if (safeRelative === null) return null;

  const cleanBase = baseDir.replace(/\/+$/, "") || "/";
  return safeRelative ? `${cleanBase}/${safeRelative}` : cleanBase;
}

export function joinPosix(base: string, rel: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanRel = rel.replace(/^\/+/, "");
  return cleanRel ? `${cleanBase}/${cleanRel}` : cleanBase;
}
