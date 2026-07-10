"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, X, Maximize2 } from "lucide-react";

interface Update {
  id: string;
  title: string;
  content: string;
  image_data: string | null;
  link_url: string | null;
  link_label: string | null;
  created_at: string;
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewerUpdate, setViewerUpdate] = useState<Update | null>(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await fetch("/api/updates");
      const data = await res.json();
      setUpdates(data.updates || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 hover:bg-white rounded-xl transition">
            <ArrowLeft size={20} className="text-[var(--text)]" />
          </Link>
          <h1 className="text-xl font-bold">Updates</h1>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">Loading...</p>
        ) : updates.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">No updates yet. Check back soon!</p>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden"
              >
                {update.image_data && (
                  <div className="relative">
                    <img src={update.image_data} alt={update.title} className="w-full h-48 object-cover" />
                    <button
                      onClick={() => setViewerUpdate(update)}
                      className="absolute bottom-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{formatDate(update.created_at)}</p>
                      <p className="text-sm font-bold">{update.title}</p>
                    </div>
                    {update.link_url && (
                      <a
                        href={update.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] hover:underline flex items-center gap-1 text-xs shrink-0"
                      >
                        {update.link_label || "Link"} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={`text-xs text-[var(--text-secondary)] leading-relaxed ${expanded !== update.id ? "line-clamp-3" : ""}`}>
                      {update.content}
                    </p>
                    {update.content.length > 150 && (
                      <button
                        onClick={() => setExpanded(expanded === update.id ? null : update.id)}
                        className="text-xs text-[var(--primary)] mt-1 hover:underline"
                      >
                        {expanded === update.id ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)] pt-8">
          A Hashtag Dropee Initiative — eX Holdings
        </p>
      </div>

      {/* Full Image Viewer Bottom Sheet */}
      {viewerUpdate && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setViewerUpdate(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setViewerUpdate(null)}
              className="absolute top-3 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text)] bg-gray-100 rounded-full transition"
            >
              <X size={18} />
            </button>

            {/* Image */}
            {viewerUpdate.image_data && (
              <div className="px-4 pb-3">
                <img
                  src={viewerUpdate.image_data}
                  alt={viewerUpdate.title}
                  className="w-full max-h-[50vh] object-contain rounded-xl bg-gray-50"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <p className="text-xs text-[var(--text-secondary)] mb-1">{formatDate(viewerUpdate.created_at)}</p>
              <h2 className="text-lg font-bold mb-3">{viewerUpdate.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {viewerUpdate.content}
              </p>
              {viewerUpdate.link_url && (
                <a
                  href={viewerUpdate.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline mt-4"
                >
                  {viewerUpdate.link_label || "Open Link"} <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
