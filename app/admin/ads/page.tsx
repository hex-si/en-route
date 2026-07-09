"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, X, Upload, Film, ImageIcon, RefreshCw, Clock } from "lucide-react";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_data: string | null;
  video_data: string | null;
  link_url: string;
  is_active: boolean;
  position: string;
  created_at: string;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", link_url: "", position: "both" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchAds = useCallback(async () => {
    const res = await fetch("/api/admin/ads");
    const data = await res.json();
    setAds(data.ads || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchAds, 10000);
    return () => clearInterval(interval);
  }, [fetchAds]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      toast.error("Failed to process image");
    }
  };

  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Video must be under 20MB");
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (video.duration > 30) {
        toast.error("Video must be 30 seconds or less");
        URL.revokeObjectURL(video.src);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    video.src = URL.createObjectURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeVideo = () => {
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.link_url.trim()) {
      toast.error("Title and link URL are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        description: form.description || null,
        image_url: form.image_url || null,
        image_data: imagePreview,
        video_data: videoPreview,
      };
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ad created");
        setShowForm(false);
        setForm({ title: "", description: "", image_url: "", link_url: "", position: "both" });
        setImagePreview(null);
        setVideoPreview(null);
        fetchAds();
      } else {
        toast.error(data.error || "Failed to create ad");
      }
    } catch {
      toast.error("Failed to create ad");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/admin/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchAds();
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
    toast.success("Ad deleted");
    fetchAds();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Ad Banners ({ads.length})</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => fetchAds()} loading={loading}>
            <RefreshCw size={14} />
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <><Plus size={14} className="mr-1" /> New Ad</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input placeholder="Ad title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Image (optional)</label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-[var(--border)]" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition text-[var(--text-secondary)]"
                  >
                    <ImageIcon size={24} />
                    <span className="text-xs">Tap to upload image</span>
                  </button>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                <Input placeholder="Or paste image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-2" />
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Video (optional, max 30s)</label>
                {videoPreview ? (
                  <div className="relative inline-block">
                    <video src={videoPreview} className="w-full h-40 object-cover rounded-xl border border-[var(--border)]" controls />
                    <button type="button" onClick={removeVideo} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition text-[var(--text-secondary)]"
                  >
                    <Film size={24} />
                    <span className="text-xs">Tap to upload video (max 30s)</span>
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
              </div>

              <Input placeholder="Link URL * (e.g. https://...)" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] text-sm"
              >
                <option value="both">Both (Landing + Dashboard)</option>
                <option value="landing">Landing Page Only</option>
                <option value="dashboard">Dashboard Only</option>
              </select>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setImagePreview(null); setVideoPreview(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="flex-1">Create Ad</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && ads.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No ads yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <Card key={ad.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ad.title}</p>
                    {ad.description && <p className="text-xs text-[var(--text-secondary)] truncate">{ad.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ad.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {ad.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{ad.position}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Clock size={10} /> {timeAgo(ad.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-3">
                  <ExternalLink size={10} />
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[var(--primary)]">{ad.link_url}</a>
                </div>
                {ad.video_data ? (
                  <video src={ad.video_data} className="w-full h-40 object-cover rounded-lg border border-[var(--border)] mb-3" controls />
                ) : ad.image_data ? (
                  <img src={ad.image_data} alt={ad.title} className="w-full h-32 object-cover rounded-lg border border-[var(--border)] mb-3" />
                ) : ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-lg border border-[var(--border)] mb-3" />
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toggleActive(ad.id, ad.is_active)}>
                    {ad.is_active ? <><ToggleRight size={14} className="mr-1" /> Deactivate</> : <><ToggleLeft size={14} className="mr-1" /> Activate</>}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteAd(ad.id)} className="text-[var(--error)] hover:bg-red-50">
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
