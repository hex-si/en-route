"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
                  <img src={update.image_data} alt={update.title} className="w-full h-48 object-cover" />
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
    </main>
  );
}
