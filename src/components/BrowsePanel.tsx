"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrowseEntry, ImageMeta } from "@/lib/ftp";
import { formatBytes, formatDate } from "@/lib/format";
import { buildImageUrl } from "./ImagePreviewModal";

interface BrowseApiResponse {
  path: string;
  entries: BrowseEntry[];
  truncated: boolean;
  error?: string;
  detail?: string;
}

interface Props {
  serverId: string;
  onPreview: (item: ImageMeta) => void;
}

function breadcrumbSegments(path: string): { label: string; path: string }[] {
  const segments = path ? path.split("/") : [];
  const crumbs = [{ label: "ルート", path: "" }];
  let acc = "";
  for (const seg of segments) {
    acc = acc ? `${acc}/${seg}` : seg;
    crumbs.push({ label: seg, path: acc });
  }
  return crumbs;
}

export default function BrowsePanel({ serverId, onPreview }: Props) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BrowseEntry[] | null>(null);
  const [truncated, setTruncated] = useState(false);

  const load = useCallback(
    async (targetPath: string) => {
      if (!serverId) return;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ serverId, path: targetPath });
        const res = await fetch(`/api/browse?${params.toString()}`);
        const data: BrowseApiResponse = await res.json();

        if (!res.ok) {
          setError(data.detail ? `${data.error}\n${data.detail}` : (data.error ?? "取得に失敗しました"));
          setEntries(null);
          return;
        }

        setEntries(data.entries);
        setTruncated(data.truncated);
        setPath(data.path);
      } catch {
        setError("通信エラーが発生しました。時間をおいて再度お試しください。");
        setEntries(null);
      } finally {
        setLoading(false);
      }
    },
    [serverId]
  );

  useEffect(() => {
    // 初回マウント時のみ実行（サーバー切り替え時は親コンポーネント側でkeyを変えて再マウントさせる）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crumbs = breadcrumbSegments(path);
  const directories = entries?.filter((e) => e.isDirectory) ?? [];
  const files = entries?.filter((e) => !e.isDirectory) ?? [];

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">/</span>}
              <button
                onClick={() => load(crumb.path)}
                disabled={loading || crumb.path === path}
                className={
                  crumb.path === path
                    ? "font-semibold text-slate-900"
                    : "text-slate-500 hover:text-slate-800 hover:underline"
                }
              >
                {crumb.label}
              </button>
            </span>
          ))}
          <button
            onClick={() => load(path)}
            disabled={loading}
            className="ml-auto rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            再読み込み
          </button>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">読み込み中...</p>}

      {error && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {truncated && !error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          このフォルダの項目数が多いため、一部のみ表示しています。サブフォルダに移動して確認してください。
        </p>
      )}

      {!loading && !error && entries && entries.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">このフォルダは空です。</p>
      )}

      {!loading && !error && directories.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            フォルダ（{directories.length}）
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {directories.map((dir) => (
              <button
                key={dir.path}
                onClick={() => load(dir.path)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm hover:border-slate-300 hover:shadow-md"
              >
                <span className="text-lg">📁</span>
                <span className="truncate font-medium text-slate-800" title={dir.name}>
                  {dir.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && files.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            ファイル（{files.length}）
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => file.isImage && onPreview(file)}
                disabled={!file.isImage}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-shadow enabled:hover:shadow-md disabled:cursor-default"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
                  {file.isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buildImageUrl(serverId, file.path, false)}
                      alt={file.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-enabled:group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-3xl text-slate-300">📄</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 px-3 py-2">
                  <span className="truncate text-sm font-medium text-slate-800" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatBytes(file.size)} ・ {formatDate(file.modifiedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
