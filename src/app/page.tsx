"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicServerInfo } from "@/lib/servers";
import type { SearchResultItem } from "@/lib/ftp";
import { formatBytes, formatDate } from "@/lib/format";

interface SearchApiResponse {
  items: SearchResultItem[];
  truncated: boolean;
  scannedCount: number;
  error?: string;
}

function buildImageUrl(serverId: string, filePath: string, download: boolean): string {
  const params = new URLSearchParams({ serverId, path: filePath });
  if (download) params.set("download", "1");
  return `/api/image?${params.toString()}`;
}

export default function Home() {
  const [servers, setServers] = useState<PublicServerInfo[]>([]);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serverId, setServerId] = useState<string>("");
  const [subPath, setSubPath] = useState("");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchResultItem[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null);

  useEffect(() => {
    fetch("/api/servers")
      .then((res) => res.json())
      .then((data: { servers: PublicServerInfo[] }) => {
        setServers(data.servers);
        if (data.servers.length > 0) setServerId(data.servers[0].id);
        if (data.servers.length === 0) {
          setServersError(
            "接続先サーバーが設定されていません。環境変数 (SAKURA_SERVER_1_HOST など) を設定してください。"
          );
        }
      })
      .catch(() => setServersError("サーバー一覧の取得に失敗しました。"));
  }, []);

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
        setError(data.error ?? "検索に失敗しました");
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900">本人確認書類 画像検索システム</h1>
          <p className="mt-1 text-sm text-slate-500">
            さくらサーバー上に保存された本人確認画像をパス検索で確認・保存します
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <form
          onSubmit={handleSearch}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              <label htmlFor="server" className="mb-1 block text-sm font-medium text-slate-700">
                接続先サーバー
              </label>
              <select
                id="server"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                disabled={servers.length === 0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100"
              >
                {servers.length === 0 && <option value="">利用可能なサーバーがありません</option>}
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

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

          {serversError && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {serversError}
            </p>
          )}

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
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                onClick={() => setPreviewItem(item)}
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
      </main>

      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{previewItem.name}</p>
                <p className="truncate text-xs text-slate-500">{previewItem.path}</p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="ml-4 shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildImageUrl(serverId, previewItem.path, false)}
                alt={previewItem.name}
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              <div className="flex gap-4">
                <span>サイズ: {formatBytes(previewItem.size)}</span>
                <span>更新日時: {formatDate(previewItem.modifiedAt)}</span>
              </div>
              <a
                href={buildImageUrl(serverId, previewItem.path, true)}
                download
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                ダウンロードして保存
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
