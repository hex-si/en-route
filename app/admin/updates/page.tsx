"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Save, Eye, EyeOff, ExternalLink, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import imageCompression from "browser-image-compression";

interface Update {
  id: string;
  title: string;
  content: string;
  image_data: string | null;
  link_url: string | null;
  link_label: string | null;
  is_published: boolean;
  created_at: string;
}

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Update | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    image_data: "",
    link_url: "",
    link_label: "",
    is_published: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await fetch("/api/admin/updates", { credentials: "include" });
      const data = await res.json();
      setUpdates(data.updates || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        content: form.content.trim(),
        image_data: form.image_data || null,
        link_url: form.link_url || null,
        link_label: form.link_label || null,
        is_published: form.is_published,
      };

      if (editing) {
        await fetch(`/api/admin/updates/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/admin/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ title: "", content: "", image_data: "", link_url: "", link_label: "", is_published: true });
      fetchUpdates();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    try {
      await fetch(`/api/admin/updates/${id}`, { method: "DELETE", credentials: "include" });
      fetchUpdates();
    } catch {}
  };

  const handleEdit = (update: Update) => {
    setEditing(update);
    setForm({
      title: update.title,
      content: update.content,
      image_data: update.image_data || "",
      link_url: update.link_url || "",
      link_label: update.link_label || "",
      is_published: update.is_published,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onload = () => {
        setForm({ ...form, image_data: reader.result as string });
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setForm({ ...form, image_data: reader.result as string });
      };
      reader.readAsDataURL(file);
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-white rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold">Updates</h1>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ title: "", content: "", image_data: "", link_url: "", link_label: "", is_published: true }); setShowForm(!showForm); }}
            className="flex items-center gap-1 bg-[var(--primary)] text-white px-3 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> New
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--border)] p-4 mb-6 space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
              required
            />
            <textarea
              placeholder="Content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] min-h-[120px] resize-y"
              required
            />

            {/* Image Upload */}
            <div>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--primary)] cursor-pointer text-sm text-[var(--text-secondary)]">
                <ImageIcon size={16} />
                {form.image_data ? "Change image" : "Add image (optional)"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {form.image_data && (
                <div className="mt-2 relative">
                  <img src={form.image_data} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_data: "" })}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="url"
                placeholder="Link URL (optional)"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                className="px-4 py-3 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <input
                type="text"
                placeholder="Link label"
                value={form.link_label}
                onChange={(e) => setForm({ ...form, link_label: e.target.value })}
                className="px-4 py-3 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded"
              />
              Published
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1 bg-[var(--primary)] text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} /> {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-3 rounded-xl border border-[var(--border)] text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Updates List */}
        {loading ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">Loading...</p>
        ) : updates.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">No updates yet</p>
        ) : (
          <div className="space-y-3">
            {updates.map((update) => (
              <div key={update.id} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                {update.image_data && (
                  <img src={update.image_data} alt={update.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-[var(--text-secondary)]">{formatDate(update.created_at)}</p>
                        {!update.is_published && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>
                        )}
                      </div>
                      <p className="text-sm font-bold truncate">{update.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{update.content}</p>
                      {update.link_url && (
                        <a href={update.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] flex items-center gap-1 mt-2 hover:underline">
                          {update.link_label || "Link"} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(update)} className="p-2 hover:bg-gray-100 rounded-lg text-sm">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleDelete(update.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 text-sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
