"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ExternalLink, Filter } from "lucide-react";

const CASE_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "CRIMINAL", label: "Criminal" },
  { value: "CIVIL", label: "Civil" },
  { value: "FAMILY", label: "Family" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ANTI_CORRUPTION", label: "Anti-Corruption" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "REPORTED", label: "Reported" },
  { value: "UNDER_INVESTIGATION", label: "Under Investigation" },
  { value: "DPP_REVIEW", label: "DPP Review" },
  { value: "FILED_IN_COURT", label: "Filed in Court" },
  { value: "ACTIVE", label: "Active" },
  { value: "ADJOURNED", label: "Adjourned" },
  { value: "ON_TRIAL", label: "On Trial" },
  { value: "PENDING_JUDGMENT", label: "Pending Judgment" },
  { value: "JUDGMENT_DELIVERED", label: "Judgment Delivered" },
  { value: "CLOSED", label: "Closed" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ON_APPEAL", label: "On Appeal" },
];

const typeVariant = (t: string): "criminal" | "civil" | "family" | "land" | "commercial" | "anticorruption" | "secondary" => {
  const m: Record<string, "criminal" | "civil" | "family" | "land" | "commercial" | "anticorruption"> = {
    CRIMINAL: "criminal", CIVIL: "civil", FAMILY: "family", LAND: "land", COMMERCIAL: "commercial", ANTI_CORRUPTION: "anticorruption",
  };
  return m[t] || "secondary";
};

const statusVariant = (s: string): "success" | "warning" | "danger" | "info" | "secondary" => {
  if (s === "FILED_IN_COURT" || s === "ACTIVE" || s === "ON_TRIAL") return "info";
  if (s === "JUDGMENT_DELIVERED" || s === "CLOSED") return "success";
  if (s === "DISMISSED" || s === "WITHDRAWN") return "danger";
  if (s === "PENDING_JUDGMENT" || s === "ADJOURNED") return "warning";
  return "secondary";
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [courts, setCourts] = useState<{ value: string; label: string }[]>([]);
  const [courtFilter, setCourtFilter] = useState("");

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (courtFilter) params.set("courtId", courtFilter);

    const res = await fetch(`/api/cases?${params}`);
    const data = await res.json();
    if (data.success) { setCases(data.data); setTotal(data.pagination?.total || 0); }
    setLoading(false);
  }, [search, typeFilter, statusFilter, courtFilter, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    fetch("/api/courts").then(r => r.json()).then(d => {
      if (d.success && Array.isArray(d.data)) {
        setCourts([{ value: "", label: "All Courts" }, ...d.data.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))]);
      }
    }).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cases" description="Manage all case records across the judiciary">
        <Button onClick={() => router.push("/dashboard/cases/new")}><Plus className="h-4 w-4" /> New Case</Button>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6 border-card-border">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-more" />
            <input
              placeholder="Search by case number or title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-lg border border-input-border bg-card pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <Select options={CASE_TYPE_OPTIONS} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} />
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} />
          <Select options={courts.length > 0 ? courts : [{ value: "", label: "All Courts" }]} value={courtFilter} onChange={(e) => { setCourtFilter(e.target.value); setPage(1); }} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : cases.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted">No cases found</p>
              <Button className="mt-4" onClick={() => router.push("/dashboard/cases/new")}>
                <Plus className="h-4 w-4" /> Create First Case
              </Button>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border bg-app">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Case No.</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Title</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Court</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Filed</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c: Record<string, unknown>) => (
                    <tr key={c.id as string} className="border-b border-border-light transition-colors hover:bg-app">
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-medium text-primary-600">{c.caseNumber as string}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-main max-w-xs truncate">{c.title as string}</td>
                      <td className="px-5 py-3"><Badge variant={typeVariant(c.caseType as string)}>{(c.caseType as string)?.replace(/_/g, " ")}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={statusVariant(c.caseStatus as string)}>{(c.caseStatus as string)?.replace(/_/g, " ")}</Badge></td>
                      <td className="px-5 py-3 text-sm text-muted">{(c.court as { name: string })?.name}</td>
                      <td className="px-5 py-3 text-sm text-muted">{new Date(c.filingDate as string).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => router.push(`/dashboard/cases/${c.id}`)}
                          className="rounded-lg p-2 text-muted-more hover:bg-app-hover hover:text-primary-600"
                          title="View case"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-card-border px-5 py-3">
                  <p className="text-sm text-muted">Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
