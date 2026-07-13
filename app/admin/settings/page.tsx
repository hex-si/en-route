"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, RefreshCw, Globe, Check, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface MappingProject {
  id: string;
  name: string;
  is_active: boolean;
  zone_feature_enabled: boolean;
  mode: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [projects, setProjects] = useState<MappingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", zone_feature_enabled: false, mode: "single" });

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/admin/mapping-projects");
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/mapping-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Mapping project created"); setShowForm(false); setForm({ name: "", zone_feature_enabled: false, mode: "single" }); fetchProjects(); }
      else { toast.error(data.error || "Failed"); }
    } catch { toast.error("Failed to create"); } finally { setSaving(false); }
  };

  const activateProject = async (id: string) => {
    await fetch(`/api/admin/mapping-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    toast.success("Mapping project activated");
    fetchProjects();
  };

  const deactivateProject = async (id: string) => {
    await fetch(`/api/admin/mapping-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    toast.success("Mapping project deactivated");
    fetchProjects();
  };

  const toggleMode = async (id: string, currentMode: string) => {
    const newMode = currentMode === "single" ? "multiple" : "single";
    await fetch(`/api/admin/mapping-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
    toast.success(`Switched to ${newMode} mapping mode`);
    fetchProjects();
  };

  const toggleZoneFeature = async (id: string, current: boolean) => {
    await fetch(`/api/admin/mapping-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone_feature_enabled: !current }),
    });
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this mapping project?")) return;
    await fetch(`/api/admin/mapping-projects/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    fetchProjects();
  };

  const activeProjects = projects.filter((p) => p.is_active);
  const hasMultipleActive = activeProjects.length > 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage mapping projects and features</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => fetchProjects()} loading={loading}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? <X size={14} /> : <><Plus size={14} className="mr-1" /> New Project</>}</Button>
        </div>
      </div>

      {/* Current Mapping Display */}
      <Card className="mb-6 border-[var(--primary)]/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
              <Globe size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Current Mapping</p>
              <p className="font-bold text-lg">{activeProjects.length === 1 ? activeProjects[0].name : activeProjects.length > 1 ? `${activeProjects.length} active projects` : "None set"}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Mode: {activeProjects.length > 0 ? (activeProjects[0].mode === "single" ? "Single (locked)" : "Multiple (user selects)") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input placeholder="Project name (e.g. Kamjong)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Mapping Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, mode: "single" })} className={`p-3 rounded-xl border-2 text-sm text-left transition ${form.mode === "single" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"}`}>
                    <p className="font-medium">Single</p>
                    <p className="text-xs text-[var(--text-secondary)]">One active project, users don&apos;t choose</p>
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, mode: "multiple" })} className={`p-3 rounded-xl border-2 text-sm text-left transition ${form.mode === "multiple" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"}`}>
                    <p className="font-medium">Multiple</p>
                    <p className="text-xs text-[var(--text-secondary)]">Multiple active, users choose one</p>
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.zone_feature_enabled} onChange={(e) => setForm({ ...form, zone_feature_enabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                <span className="text-sm">Enable zone/locality feature for this project</span>
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setForm({ name: "", zone_feature_enabled: false, mode: "single" }); }} className="flex-1">Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="flex-1">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && projects.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">No mapping projects yet.</div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className={project.is_active ? "border-[var(--primary)]/30" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.is_active ? "bg-[var(--primary)]/10" : "bg-gray-100"}`}>
                      {project.is_active ? <Check size={18} className="text-[var(--primary)]" /> : <Globe size={18} className="text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Mode: {project.mode === "single" ? "Single" : "Multiple"} | Zones: {project.zone_feature_enabled ? "On" : "Off"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${project.is_active ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-gray-100 text-gray-500"}`}>
                    {project.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!project.is_active ? (
                    <Button size="sm" onClick={() => activateProject(project.id)}>Activate</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => deactivateProject(project.id)}>Deactivate</Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => toggleMode(project.id, project.mode)}>
                    {project.mode === "single" ? "Switch to Multiple" : "Switch to Single"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggleZoneFeature(project.id, project.zone_feature_enabled)}>
                    {project.zone_feature_enabled ? "Disable Zones" : "Enable Zones"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteProject(project.id)} className="text-[var(--error)] hover:bg-red-50">
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
