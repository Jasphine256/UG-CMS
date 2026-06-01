"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Users, Calendar, Scale, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

const typeVariant = (t:string) => { const m:Record<string,"criminal"|"civil"|"family"|"land"|"commercial"|"anticorruption"|"secondary"> = { CRIMINAL:"criminal",CIVIL:"civil",FAMILY:"family",LAND:"land",COMMERCIAL:"commercial",ANTI_CORRUPTION:"anticorruption" }; return m[t]||"secondary"; };
const statusVariant = (s:string) => { if(["ACTIVE","FILED_IN_COURT","ON_TRIAL"].includes(s)) return "info"; if(["JUDGMENT_DELIVERED","CLOSED"].includes(s)) return "success"; if(["DISMISSED","WITHDRAWN"].includes(s)) return "danger"; if(["PENDING_JUDGMENT","ADJOURNED","UNDER_INVESTIGATION"].includes(s)) return "warning"; return "secondary"; };

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Record<string,unknown>|null>(null);
  const [backlog, setBacklog] = useState<Record<string,unknown>|null>(null);
  const [recentCases, setRecentCases] = useState<Record<string,unknown>[]>([]);
  const [hearings, setHearings] = useState<Record<string,unknown>[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/case-summary").then(r=>r.json()),
      fetch("/api/reports/backlog").then(r=>r.json()),
      fetch("/api/cases?limit=5").then(r=>r.json()),
      fetch("/api/hearings?limit=5").then(r=>r.json()),
      fetch("/api/users?limit=1").then(r=>r.json()),
    ]).then(([s,b,c,h,u]) => {
      if (s.success) setSummary(s.data);
      if (b.success) setBacklog(b.data);
      if (c.success) setRecentCases(c.data);
      if (h.success) setHearings(h.data);
      if (u.success) setUserCount(u.pagination?.total || 0);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}
      </div>
      <Skeleton className="h-64"/>
    </div>
  );

  const stats = [
    { label:"Total Cases", value: String(summary?.total||0), icon:FolderOpen, color:"text-blue-600", bg:"bg-blue-50" },
    { label:"Active Cases", value: String(backlog?.totalBacklog||0), icon:Scale, color:"text-amber-600", bg:"bg-amber-50" },
    { label:"Hearings Today", value: String(hearings.length), icon:Calendar, color:"text-emerald-600", bg:"bg-emerald-50" },
    { label:"Users", value: String(userCount), icon:Users, color:"text-purple-600", bg:"bg-purple-50" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-main">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Uganda Case Management System Overview</p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label} className="border-card-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`}/>
              </div>
              <div>
                <p className="text-2xl font-bold text-main">{stat.value}</p>
                <p className="text-xs text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-card-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{String(backlog?.closedCases||0)}</p>
          <p className="text-xs text-muted">Closed Cases</p>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-danger-600">{String(backlog?.backlogRate||0)}%</p>
          <p className="text-xs text-muted">Backlog Rate</p>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-info-600">{String((summary?.byType as unknown[]||[]).length)}</p>
          <p className="text-xs text-muted">Case Types</p>
        </CardContent></Card>
        <Card className="border-card-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">63</p>
          <p className="text-xs text-muted">API Routes</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card className="border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-semibold">Recent Cases</h3>
              <button onClick={()=>router.push("/dashboard/cases")} className="text-xs text-primary-600 hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentCases.length===0 ? (
              <div className="py-8 text-center text-muted-more text-sm">No cases yet</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-y border-border-light bg-app">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase text-muted">Case No.</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase text-muted">Title</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase text-muted">Status</th>
                </tr></thead>
                <tbody>
                  {recentCases.map((c:Record<string,unknown>) => (
                    <tr key={c.id as string} className="border-b border-border-light hover:bg-app cursor-pointer" onClick={()=>router.push(`/dashboard/cases/${c.id}`)}>
                      <td className="px-5 py-3 font-mono text-xs font-medium text-primary-600">{c.caseNumber as string}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{c.title as string}</td>
                      <td className="px-5 py-3"><Badge variant={statusVariant(c.caseStatus as string)}>{(c.caseStatus as string)?.replace(/_/g," ")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Hearings */}
        <Card className="border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-semibold">Upcoming Hearings</h3>
              <button onClick={()=>router.push("/dashboard/hearings")} className="text-xs text-primary-600 hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent>
            {hearings.length===0 ? (
              <div className="py-8 text-center text-muted-more text-sm">No hearings scheduled</div>
            ) : (
              <div className="space-y-3">
                {hearings.map((h:Record<string,unknown>) => (
                  <div key={h.id as string} className="flex items-start gap-3 border-b border-border-light pb-3 last:border-0">
                    <div className="shrink-0 rounded-lg bg-primary-50 px-2 py-1 text-center">
                      <p className="text-xs font-bold text-primary-700">{new Date(h.hearingDate as string).toLocaleDateString("en",{month:"short",day:"numeric"})}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-main">{(h.case as {caseNumber?:string})?.caseNumber}</p>
                      <p className="text-xs text-muted">{(h.hearingType as string)?.replace(/_/g," ")} · {(h.court as {name?:string})?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
