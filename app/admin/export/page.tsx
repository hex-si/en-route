"use client";
import { useState } from "react";
import { Download, FileText, Table } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminExportPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    const res = await fetch("/api/users?limit=10000", {
      headers: { "x-admin-key": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
    });
    const data = await res.json();
    return data.users || [];
  };

  const exportCSV = async () => {
    setLoading("csv");
    try {
      const users = await fetchUsers();
      const headers = ["Registration ID", "Name", "Phone", "Location", "Maps Link", "Location Description", "Photos", "Points", "Referral Code", "Verification Status", "House Type", "Registered At"];
      const rows = users.map((u: any) => [
        u.household_registration_id || "", u.full_name, u.phone, u.location || "",
        u.maps_link, u.location_desc || "",
        (u.photos || []).join("; "), u.points,
        u.referral_code, u.verification_status, u.house_type || "", new Date(u.created_at).toISOString(),
      ]);
      const csv = [headers.join(","), ...rows.map((r: any[]) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `en-route-users-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(null);
    }
  };

  const exportExcel = async () => {
    setLoading("excel");
    try {
      const users = await fetchUsers();
      const headers = ["Registration ID", "Name", "Phone", "Location", "Maps Link", "Location Description", "Points", "Verification Status", "House Type", "Registered At"];
      const rows = users.map((u: any) => [
        u.household_registration_id || "", u.full_name, u.phone, u.location || "",
        u.maps_link || "", u.location_desc || "",
        u.points, u.verification_status, u.house_type || "", new Date(u.created_at).toLocaleDateString(),
      ]);
      const html = `
<!DOCTYPE html>
<html><head><title>En-Route Users</title>
<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5;font-weight:bold}tr:nth-child(even){background:#fafafa}</style>
</head><body>
<h1>En-Route Users Export</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Total: ${users.length} households</p>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
${rows.map((r: any[]) => `<tr>${r.map((c) => `<td>${String(c).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`).join("")}
</tbody></table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `en-route-users-${new Date().toISOString().split("T")[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel file downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(null);
    }
  };

  const exportPDF = async () => {
    setLoading("pdf");
    try {
      const users = await fetchUsers();
      const html = `
<!DOCTYPE html>
<html><head><title>En-Route Users</title>
<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}tr:nth-child(even){background:#fafafa}@media print{body{padding:10px}}</style>
</head><body>
<h1>En-Route Users Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Total: ${users.length} households</p>
<table><thead><tr><th>Reg ID</th><th>Name</th><th>Phone</th><th>Location</th><th>Maps Link</th><th>Description</th><th>Points</th><th>Status</th><th>House Type</th><th>Date</th></tr></thead><tbody>
${users.map((u: any) => `<tr><td>${u.household_registration_id || ""}</td><td>${u.full_name}</td><td>${u.phone}</td><td>${u.location || ""}</td><td><a href="${u.maps_link}">Maps</a></td><td>${u.location_desc || ""}</td><td>${u.points}</td><td>${u.verification_status}</td><td>${u.house_type || ""}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join("")}
</tbody></table></body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `en-route-users-${new Date().toISOString().split("T")[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded — open in browser and print to PDF");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Export Data</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hover:shadow-md transition cursor-pointer" onClick={exportCSV}>
          <Card>
            <CardContent className="py-6 text-center">
              <Table size={32} className="mx-auto mb-3 text-green-600" />
              <p className="font-medium">Export CSV</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Spreadsheet format</p>
              {loading === "csv" && <p className="text-xs text-[var(--primary)] mt-2">Generating...</p>}
            </CardContent>
          </Card>
        </div>
        <div className="hover:shadow-md transition cursor-pointer" onClick={exportExcel}>
          <Card>
            <CardContent className="py-6 text-center">
              <Table size={32} className="mx-auto mb-3 text-blue-600" />
              <p className="font-medium">Export Excel</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Microsoft Excel format</p>
              {loading === "excel" && <p className="text-xs text-[var(--primary)] mt-2">Generating...</p>}
            </CardContent>
          </Card>
        </div>
        <div className="hover:shadow-md transition cursor-pointer" onClick={exportPDF}>
          <Card>
            <CardContent className="py-6 text-center">
              <FileText size={32} className="mx-auto mb-3 text-orange-600" />
              <p className="font-medium">Export PDF</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Printable report</p>
              {loading === "pdf" && <p className="text-xs text-[var(--primary)] mt-2">Generating...</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
