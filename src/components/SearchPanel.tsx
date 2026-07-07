"use client";

import { useMemo, useState } from "react";
import type { SearchResultItem, ImageMeta } from "@/lib/ftp";
import { formatBytes } from "@/lib/format";
import { buildImageUrl } from "./ImagePreviewModal";

interface SearchApiResponse {
  items: SearchResultItem[];
  truncated: boolean;
  scannedCount: number;
  error?: string;
  detail?: string;
}

interface Props {
  serverId: string;
  onPreview: (item: ImageMeta) => void;
}

export default function SearchPanel({ serverId, onPreview }: Props) {
  const [subPath, setSubPath] = useState("");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchResultItem[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const canSearch = useMemo(
    () => serverId !== "" && keyword.trim().length >= 2 && !loading,
    [serverId, keyword, loading]
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    setItems(null);

    try {
      const params = new URLSearchParams({ serverId, keyword: keyword.trim() });
      if (subPath.trim()) params.set("subPath", subPath.trim());

      const res = await fetch(`/api/search?${params.toString()}`);
      const data: SearchApiResponse = await res.json();

      if (!res.ok) {
        setError(data.detail ? `${data.error}\n${data.detail}` : (data.error ?? "検索に失敗しました"));
        return;
      }

      setItems(data.items);
      setTruncated(data.truncated);
      setScannedCount(data.scannedCount);
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="keyword" className="mb-1 block text-sm font-medium text-slate-700">
            検索キーワード（ファイル名・パスの一部、2文字以上）
          </label>
          <input
            id="keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: 12345 や 田中 など"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
            詳細検索オプション
          </summary>
          <div className="mt-3">
            <label htmlFor="subPath" className="mb-1 block text-sm font-medium text-slate-700">
              検索対象サブフォルダ（任意・絞り込むほど高速化します）
            </label>
            <input
              id="subPath"
              type="text"
              value={subPath}
              onChange={(e) => setSubPath(e.target.value)}
              placeholder="例: 2026/06"
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </details>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSearch}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "検索中..." : "検索する"}
          </button>
          {items && !loading && (
            <span className="text-sm text-slate-500">
              {items.length} 件ヒット（{scannedCount.toLocaleString()} 件のファイルを走査）
            </span>
          )}
        </div>
      </form>

      {error && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {truncated && !error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          検索結果が上限に達したため、一部の結果のみ表示しています。サブフォルダやキーワードを絞り込んでください。
        </p>
      )}

      {items && items.length === 0 && !error && (
        <p className="mt-6 text-sm text-slate-500">該当する画像が見つかりませんでした。</p>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => onPreview(item)}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildImageUrl(serverId, item.path, false)}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="truncate text-sm font-medium text-slate-800" title={item.path}>
                  {item.name}
                </span>
                <span className="text-xs text-slate-400">{formatBytes(item.size)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
