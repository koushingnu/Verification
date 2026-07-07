"use client";

import type { ImageMeta } from "@/lib/ftp";
import { formatBytes, formatDate } from "@/lib/format";

export function buildImageUrl(serverId: string, filePath: string, download: boolean): string {
  const params = new URLSearchParams({ serverId, path: filePath });
  if (download) params.set("download", "1");
  return `/api/image?${params.toString()}`;
}

interface Props {
  serverId: string;
  item: ImageMeta;
  onClose: () => void;
}

export default function ImagePreviewModal({ serverId, item, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="truncate text-xs text-slate-500">{item.path}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildImageUrl(serverId, item.path, false)}
            alt={item.name}
            className="max-h-[65vh] max-w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <div className="flex gap-4">
            <span>サイズ: {formatBytes(item.size)}</span>
            <span>更新日時: {formatDate(item.modifiedAt)}</span>
          </div>
          <a
            href={buildImageUrl(serverId, item.path, true)}
            download
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ダウンロードして保存
          </a>
        </div>
      </div>
    </div>
  );
}
