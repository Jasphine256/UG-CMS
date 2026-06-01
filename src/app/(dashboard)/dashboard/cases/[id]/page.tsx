"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Users, FileText, Gavel, AlertTriangle, Clock, CheckCircle, XCircle,
  Scale, Shield, Plus, UserPlus, ChevronRight, Ban, Play, Pause, Flag,
} from "lucide-react";

const typeVariant = (t: string) => {
  const m: Record<string, "criminal"|"civil"|"family"|"land"|"commercial"|"anticorruption"> = {
    CRIMINAL:"criminal", CIVIL:"civil", FAMILY:"family", LAND:"land", COMMERCIAL:"commercial", ANTI_CORRUPTION:"anticorruption"
  };
  return m[t] || "secondary";
};

const statusVariant = (s: string) => {
  if (["FILED_IN_COURT","ACTIVE","ON_TRIAL","COMMITTED_FOR_TRIAL"].includes(s)) return "info";
  if (["JUDGMENT_DELIVERED","CLOSED"].includes(s)) return "success";
  if (["DISMISSED","WITHDRAWN"].includes(s)) return "danger";
  if (["PENDING_JUDGMENT","ADJOURNED"].includes(s)) return "warning";
  return "secondary";
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ["UNDER_INVESTIGATION", "WITHDRAWN"],
  UNDER_INVESTIGATION: ["DPP_REVIEW", "CLOSED"],
  DPP_REVIEW: ["FILED_IN_COURT", "CLOSED"],
  FILED_IN_COURT: ["ACTIVE", "DISMISSED", "WITHDRAWN", "TRANSFERRED"],
  ACTIVE: ["ADJOURNED", "COMMITTED_FOR_TRIAL", "ON_TRIAL", "CLOSED"],
  ADJOURNED: ["ACTIVE", "DISMISSED"],
  COMMITTED_FOR_TRIAL: ["ON_TRIAL"],
  ON_TRIAL: ["PENDING_JUDGMENT", "ADJOURNED"],
  PENDING_JUDGMENT: ["JUDGMENT_DELIVERED"],
  JUDGMENT_DELIVERED: ["CLOSED", "ON_APPEAL"],
  CLOSED: [], DISMISSED: [], WITHDRAWN: [],
  TRANSFERRED: ["FILED_IN_COURT"],
  ON_APPEAL: ["CLOSED"],
};

const STATUS_LABELS: Record<string, string> = {
  REPORTED:"Reported", UNDER_INVESTIGATION:"Under Investigation", DPP_REVIEW:"DPP Review",
  FILED_IN_COURT:"Filed in Court", ACTIVE:"Active", ADJOURNED:"Adjourned",
  COMMITTED_FOR_TRIAL:"Committed for Trial", ON_TRIAL:"On Trial",
  PENDING_JUDGMENT:"Pending Judgment", JUDGMENT_DELIVERED:"Judgment Delivered",
  CLOSED:"Closed", DISMISSED:"Dismissed", WITHDRAWN:"Withdrawn", TRANSFERRED:"Transferred", ON_APPEAL:"On Appeal",
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kase, setCase] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [parties, setParties] = useState<Record<string, unknown>[]>([]);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [hearings, setHearings] = useState<Record<string, unknown>[]>([]);
  const [judges, setJudges] = useState<{ value: string; label: string }[]>([]);
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchCase = useCallback(async () => {
    const res = await fetch(`/api/cases/${id}`);
    const data = await res.json();
    if (data.success) setCase(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  useEffect(() => {
    fetch(`/api/cases/${id}/parties`).then(r => r.json()).then(d => { if (d.success) setParties(d.data); });
    fetch(`/api/cases/${id}/timeline`).then(r => r.json()).then(d => { if (d.success) setTimeline(d.data); });
    fetch(`/api/cases/${id}/hearings`).then(r => r.json()).then(d => { if (d.success) setHearings(d.data); });
    fetch("/api/users?limit=50").then(r => r.json()).then(d => {
      if (d.success) {
        setJudges(d.data.filter((u: { roles?: { role?: { slug?: string } }[] }) => u.roles?.some((r: { role?: { slug?: string } }) => r.role?.slug?.includes("judge") || r.role?.slug?.includes("magistrate"))).map((u: { id: string; firstName: string; lastName: string }) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })));
      }
    });
  }, [id]);

  async function changeStatus(newStatus: string) {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/cases/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Status changed to ${STATUS_LABELS[newStatus]}`); fetchCase(); }
      else toast.error(data.error);
    } finally { setChangingStatus(false); }
  }

  async function assignJudge(judgeId: string) {
    const res = await fetch(`/api/cases/${id}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judgeId }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Judge assigned"); fetchCase(); }
    else toast.error(data.error);
  }

  if (loading) return <div className="space-y-4 pt-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!kase) return <EmptyState title="Case not found" />;

  const status = kase.caseStatus as string;
  const transitions = VALID_TRANSITIONS[status] || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Gavel },
    { id: "parties", label: "Parties", icon: Users, count: parties.length },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "hearings", label: "Hearings", icon: Calendar, count: hearings.length },
  ];

  return (
    <div className="animate-fade-in">
      {/* Back + Title bar */}
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard/cases")} className="mb-3 flex items-center gap-1 text-sm text-muted hover:text-secondary">
          <ArrowLeft className="h-3 w-3" /> Back to cases
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-main">{kase.title as string}</h1>
              <Badge variant={typeVariant(kase.caseType as string)}>{(kase.caseType as string)?.replace(/_/g, " ")}</Badge>
              <Badge variant={statusVariant(status)}>{STATUS_LABELS[status] || status}</Badge>
            </div>
            <p className="font-mono text-sm text-primary-600">{kase.caseNumber as string}</p>
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-2">
            {transitions.map(t => (
              <Button key={t} size="sm" variant="outline" onClick={() => changeStatus(t)} loading={changingStatus}>
                {t === "CLOSED" && <CheckCircle className="h-3 w-3" />}
                {t === "DISMISSED" && <XCircle className="h-3 w-3" />}
                {t === "ON_TRIAL" && <Play className="h-3 w-3" />}
                {t === "ADJOURNED" && <Pause className="h-3 w-3" />}
                {STATUS_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-card-border"><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"><Scale className="h-4 w-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted">Court</p><p className="text-sm font-medium">{(kase.court as {name?:string})?.name}</p></div>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50"><Calendar className="h-4 w-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted">Filed</p><p className="text-sm font-medium">{new Date(kase.filingDate as string).toLocaleDateString()}</p></div>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50"><Gavel className="h-4 w-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted">Judge</p>
            {kase.assignedJudge ? (
              <p className="text-sm font-medium">{(kase.assignedJudge as {firstName?:string;lastName?:string})?.firstName} {(kase.assignedJudge as {firstName?:string;lastName?:string})?.lastName}</p>
            ) : (
              <div className="relative inline-flex">
                <select className="cursor-pointer rounded border border-input-border bg-card px-2 py-0.5 text-xs" value="" onChange={e => { if(e.target.value) assignJudge(e.target.value); }}>
                  <option value="">Assign...</option>
                  {judges.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50"><Users className="h-4 w-4 text-purple-600" /></div>
          <div><p className="text-xs text-muted">Parties</p><p className="text-sm font-medium">{parties.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-app-hover p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                tab === t.id ? "bg-card text-main shadow-sm" : "text-muted hover:text-secondary"
              )}>
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-card-border">
            <CardHeader><h3 className="font-semibold">Case Details</h3></CardHeader>
            <CardContent>
              {kase.criminalDetails ? (
                <div className="space-y-3 mb-4">
                  <div className="rounded-lg bg-danger-50 p-3">
                    <p className="text-xs font-semibold text-danger-600">Criminal Case</p>
                    <p className="mt-1 text-sm font-medium">{(kase.criminalDetails as Record<string,string>).offenceType}</p>
                    {Boolean((kase.criminalDetails as Record<string,string>).penalCodeSection) && (
                      <p className="text-xs text-muted">Penal Code: {(kase.criminalDetails as Record<string,string>).penalCodeSection}</p>
                    )}
                    {Boolean((kase.criminalDetails as Record<string,string>).offenceDescription) && (
                      <p className="mt-1 text-xs text-secondary">{(kase.criminalDetails as Record<string,string>).offenceDescription}</p>
                    )}
                  </div>
                </div>
              ) : null}
              {kase.civilDetails ? (
                <div className="space-y-3 mb-4">
                  <div className="rounded-lg bg-info-50 p-3">
                    <p className="text-xs font-semibold text-info-600">Civil Case</p>
                    {Boolean((kase.civilDetails as Record<string,string>).claimAmount) && (
                      <p className="mt-1 text-sm font-medium">Claim: UGX {parseInt(String((kase.civilDetails as Record<string,string>).claimAmount)).toLocaleString()}</p>
                    )}
                    {Boolean((kase.civilDetails as Record<string,string>).natureOfDispute) && (
                      <p className="text-xs text-secondary">{(kase.civilDetails as Record<string,string>).natureOfDispute}</p>
                    )}
                  </div>
                </div>
              ) : null}
              {Boolean(kase.description) && <p className="text-sm text-secondary">{kase.description as string}</p>}
              {!kase.description && !kase.criminalDetails && !kase.civilDetails && <p className="text-sm text-muted-more">No additional details</p>}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader><h3 className="font-semibold">Recent Timeline</h3></CardHeader>
            <CardContent>
              {timeline.length === 0 ? <p className="text-sm text-muted-more">No events yet</p> : (
                <div className="space-y-4">
                  {timeline.slice(0, 8).map((t: Record<string, unknown>, i: number) => (
                    <div key={t.id as string} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("h-2 w-2 rounded-full mt-2", i === 0 ? "bg-primary-500 ring-4 ring-primary-100" : "bg-muted-more")} />
                        {i < timeline.slice(0, 8).length - 1 && <div className="w-px flex-1 bg-app-hover" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-main">{t.title as string}</p>
                        {Boolean(t.description) && <p className="text-xs text-muted">{String(t.description)}</p>}
                        <p className="mt-0.5 text-[11px] text-muted-more">
                          {new Date(t.eventDate as string).toLocaleDateString()} · {(t.createdBy as {firstName?:string;lastName?:string})?.firstName} {(t.createdBy as {firstName?:string;lastName?:string})?.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "parties" && (
        <Card className="border-card-border">
          <CardContent className="p-0">
            {parties.length === 0 ? <EmptyState title="No parties" description="Add parties to this case" /> : (
              <table className="w-full">
                <thead><tr className="border-b border-card-border bg-app">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Representation</th>
                </tr></thead>
                <tbody>
                  {parties.map((p: Record<string, unknown>) => (
                    <tr key={p.id as string} className="border-b border-border-light hover:bg-app">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-hover text-xs font-bold text-secondary">
                            {(p.firstName as string)?.[0]}{(p.lastName as string)?.[0]}
                          </div>
                          <span className="text-sm font-medium">{p.firstName as string} {p.lastName as string}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge variant="secondary">{p.partyType as string}</Badge></td>
                      <td className="px-5 py-3 text-sm text-muted">{p.phoneNumber as string || p.email as string || "-"}</td>
                      <td className="px-5 py-3 text-sm text-muted">{(p.representation as string) || "Self"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "timeline" && (
        <Card className="border-card-border">
          <CardContent className="p-0">
            {timeline.length === 0 ? <EmptyState title="No timeline events" /> : (
              <div className="divide-y divide-surface-100">
                {timeline.map((t: Record<string, unknown>, i: number) => (
                  <div key={t.id as string} className="flex gap-4 px-6 py-4 hover:bg-app">
                    <div className="flex flex-col items-center">
                      <div className={cn("h-3 w-3 rounded-full mt-1", i===0 ? "bg-primary-500 ring-4 ring-primary-100" : "bg-muted-more")} />
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-app-hover mt-1" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-main">{t.title as string}</p>
                        <Badge variant="secondary" size="sm">{t.eventType as string}</Badge>
                      </div>
                      {Boolean(t.description) && <p className="mt-0.5 text-xs text-muted">{String(t.description)}</p>}
                      <p className="mt-1 text-[11px] text-muted-more">
                        {new Date(t.eventDate as string).toLocaleString()} · {(t.createdBy as {firstName?:string;lastName?:string})?.firstName} {(t.createdBy as {firstName?:string;lastName?:string})?.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "hearings" && (
        <Card className="border-card-border">
          <CardContent className="p-0">
            {hearings.length === 0 ? (
              <EmptyState title="No hearings" description="Schedule the first hearing for this case" action={{ label: "Schedule Hearing", href: "/dashboard/hearings" }} />
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-card-border bg-app">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Court</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Outcome</th>
                </tr></thead>
                <tbody>
                  {hearings.map((h: Record<string, unknown>) => (
                    <tr key={h.id as string} className="border-b border-border-light">
                      <td className="px-5 py-3 text-sm">{new Date(h.hearingDate as string).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm">{((h.hearingType as string) || "").replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-sm text-muted">{(h.court as {name?:string})?.name}</td>
                      <td className="px-5 py-3 text-sm text-muted">{(h.outcome as string) || "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
