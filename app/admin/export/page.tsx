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
      const headers = ["Registration ID", "Name", "Phone", "Zone", "Maps Link", "Location Description", "Photos", "Points", "Referral Code", "Verification Status", "House Type", "Registered At"];
      const rows = users.map((u: any) => [
        u.household_registration_id || "", u.full_name, u.phone, u.zone_id || "",
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

  const exportPDF = async () => {
    setLoading("pdf");
    try {
      const users = await fetchUsers();
      // Simple HTML table exported as printable HTML
      const html = `
<!DOCTYPE html>
<html><head><title>En-Route Users</title>
<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}tr:nth-child(even){background:#fafafa}</style>
</head><body>
<h1>En-Route Users Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Total: ${users.length} households</p>
<table><thead><tr><th>Reg ID</th><th>Name</th><th>Phone</th><th>Maps Link</th><th>Description</th><th>Points</th><th>Status</th><th>House Type</th><th>Date</th></tr></thead><tbody>
${users.map((u: any) => `<tr><td>${u.household_registration_id || ""}</td><td>${u.full_name}</td><td>${u.phone}</td><td><a href="${u.maps_link}">Maps</a></td><td>${u.location_desc || ""}</td><td>${u.points}</td><td>${u.verification_status}</td><td>${u.house_type || ""}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join("")}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition">
          <CardContent className="text-center py-8">
            <Table size={32} className="mx-auto text-[var(--primary)] mb-3" />
            <h2 className="font-semibold mb-1">CSV Export</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Spreadsheet format. All user data.</p>
            <Button onClick={exportCSV} loading={loading === "csv"}>
              <Download size={16} className="mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition">
          <CardContent className="text-center py-8">
            <FileText size={32} className="mx-auto text-[var(--primary)] mb-3" />
            <h2 className="font-semibold mb-1">PDF Report</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Printable HTML report. Open in browser, print to PDF.</p>
            <Button onClick={exportPDF} loading={loading === "pdf"}>
              <Download size={16} className="mr-2" /> Download Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
