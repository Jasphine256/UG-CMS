"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";

interface AuditLog {
  id: string; action: string; resource: string; resourceId?: string;
  oldValue?: unknown; newValue?: unknown; createdAt: string;
  user?: { id: string; email: string; firstName: string; lastName: string } | null;
}

const resourceOptions = [
  { value: "", label: "All Resources" },
  { value: "CASE", label: "Case" },
  { value: "USER", label: "User" },
  { value: "ROLE", label: "Role" },
  { value: "COURT", label: "Court" },
  { value: "HEARING", label: "Hearing" },
  { value: "EVIDENCE", label: "Evidence" },
  { value: "DOCUMENT", label: "Document" },
  { value: "BAIL_APPLICATION", label: "Bail" },
  { value: "APPEAL", label: "Appeal" },
  { value: "DETENTION", label: "Detention" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (resource) params.set("resource", resource);
    const res = await fetch(`/api/audit-logs?${params}`);
    const data = await res.json();
    if (data.success) setLogs(data.data);
    setLoading(false);
  }, [resource]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const resourceVariant = (r: string) => {
    const map: Record<string, "info" | "success" | "warning" | "danger" | "secondary"> = {
      CASE: "info", USER: "secondary", ROLE: "warning", COURT: "success", HEARING: "info",
      EVIDENCE: "danger", DOCUMENT: "secondary", BAIL_APPLICATION: "warning", APPEAL: "secondary",
    };
    return map[r] || "secondary";
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit Logs" description="Track all system activity and changes" />

      <div className="mb-4">
        <div className="max-w-xs">
          <Select
            label="Filter by Resource"
            options={resourceOptions}
            value={resource}
            onChange={(e) => setResource(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-more">No audit logs found</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-app">
                  <div className="shrink-0 pt-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-hover text-xs font-bold text-muted">
                      {log.user ? log.user.firstName[0] + log.user.lastName[0] : "S"}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-secondary">
                      <span className="font-medium">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</span>
                      {" "}{log.action.replace(/_/g, " ").toLowerCase()}{" "}
                      <Badge variant={resourceVariant(log.resource)} size="sm">{log.resource.replace(/_/g, " ")}</Badge>
                    </p>
                    {log.resourceId && (
                      <p className="mt-0.5 text-xs text-muted-more font-mono">{log.resourceId}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-more">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
