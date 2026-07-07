"use client";

import { useEffect, useState } from "react";
import type { PublicServerInfo } from "@/lib/servers";
import type { ImageMeta } from "@/lib/ftp";
import BrowsePanel from "@/components/BrowsePanel";
import SearchPanel from "@/components/SearchPanel";
import ImagePreviewModal from "@/components/ImagePreviewModal";

type Tab = "browse" | "search";

export default function Home() {
  const [servers, setServers] = useState<PublicServerInfo[]>([]);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serverId, setServerId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("browse");
  const [previewItem, setPreviewItem] = useState<ImageMeta | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-900">本人確認書類 画像検索システム</h1>
          <p className="mt-1 text-sm text-slate-500">
            さくらサーバー上に保存された本人確認画像をフォルダ閲覧・キーワード検索で確認・保存します
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xs">
            <label htmlFor="server" className="mb-1 block text-sm font-medium text-slate-700">
              接続先サーバー
            </label>
            <select
              id="server"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              disabled={servers.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100"
            >
              {servers.length === 0 && <option value="">利用可能なサーバーがありません</option>}
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("browse")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "browse" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              フォルダを見る
            </button>
            <button
              onClick={() => setTab("search")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "search" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              キーワード検索
            </button>
          </div>
        </div>

        {serversError && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{serversError}</p>
        )}

        {serverId &&
          (tab === "browse" ? (
            <BrowsePanel key={`browse-${serverId}`} serverId={serverId} onPreview={setPreviewItem} />
          ) : (
            <SearchPanel key={`search-${serverId}`} serverId={serverId} onPreview={setPreviewItem} />
          ))}
      </main>

      {previewItem && (
        <ImagePreviewModal serverId={serverId} item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}
