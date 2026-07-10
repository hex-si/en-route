"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, X, RefreshCw, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface Area {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchAreas = useCallback(async () => {
    const res = await fetch("/api/admin/areas");
    const data = await res.json();
    setAreas(data.areas || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  useEffect(() => {
    const interval = setInterval(fetchAreas, 10000);
    return () => clearInterval(interval);
  }, [fetchAreas]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Area name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Area created");
        setShowForm(false);
        setForm({ name: "", description: "" });
        fetchAreas();
      } else {
        toast.error(data.error || "Failed to create area");
      }
    } catch {
      toast.error("Failed to create area");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/admin/areas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchAreas();
  };

  const deleteArea = async (id: string) => {
    if (!confirm("Delete this area?")) return;
    await fetch(`/api/admin/areas/${id}`, { method: "DELETE" });
    toast.success("Area deleted");
    fetchAreas();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Areas ({areas.length})</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => fetchAreas()} loading={loading}>
            <RefreshCw size={14} />
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} /> : <><Plus size={14} className="mr-1" /> New Area</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="Area name * (e.g. Ukhrul)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <div className="flex gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setForm({ name: "", description: "" }); }} className="flex-1">Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="flex-1">Create Area</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && areas.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : areas.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No areas yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <Card key={area.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{area.name}</p>
                      {area.description && (
                        <p className="text-xs text-[var(--text-secondary)]">{area.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${area.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {area.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => toggleActive(area.id, area.is_active)}>
                    {area.is_active ? <><ToggleRight size={14} className="mr-1" /> Deactivate</> : <><ToggleLeft size={14} className="mr-1" /> Activate</>}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteArea(area.id)} className="text-[var(--error)] hover:bg-red-50">
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
