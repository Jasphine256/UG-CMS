"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Scale, Download } from "lucide-react";

const COLORS = ["#1a56db","#dc2626","#9333ea","#65a30d","#0891b2","#ea580c","#f59e0b","#6366f1","#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16","#ec4899","#64748b"];

export default function ReportsPage() {
  const [summary, setSummary] = useState<Record<string,unknown>|null>(null);
  const [backlog, setBacklog] = useState<Record<string,unknown>|null>(null);
  const [courts, setCourts] = useState<Record<string,unknown>[]>([]);
  const [hearings, setHearings] = useState<Record<string,unknown>|null>(null);
  const [judges, setJudges] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/case-summary").then(r=>r.json()),
      fetch("/api/reports/backlog").then(r=>r.json()),
      fetch("/api/reports/court-performance").then(r=>r.json()),
      fetch("/api/reports/hearings-stats").then(r=>r.json()),
      fetch("/api/reports/judge-performance").then(r=>r.json()),
    ]).then(([s,b,c,h,j]) => {
      if (s.success) setSummary(s.data);
      if (b.success) setBacklog(b.data);
      if (c.success) setCourts(c.data);
      if (h.success) setHearings(h.data);
      if (j.success) setJudges(j.data);
      setLoading(false);
    });
  }, []);

  function exportCSV() {
    const rows = [["Metric","Value"],["Total Cases",String(summary?.total||"")],["Backlog",String(backlog?.totalBacklog||"")],["Closed Cases",String(backlog?.closedCases||"")],["Backlog Rate",(backlog?.backlogRate as number)+"%"]];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="case-summary.csv"; a.click();
  }

  if (loading) return <div className="space-y-4">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-40 w-full"/>)}</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" description="Analytics and performance metrics">
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg border border-input-border px-3 py-2 text-sm hover:bg-app-hover"><Download className="h-4 w-4"/> Export CSV</button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Case Type Distribution */}
        <Card className="border-card-border">
          <CardHeader><h3 className="font-semibold">Case Type Distribution</h3></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={(summary?.byType as unknown[]||[]).map((t:unknown)=>(t as {label:string;count:number}))} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({name,value})=>`${name}: ${value}`}>
                  {(summary?.byType as unknown[]||[]).map((_:unknown,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Case Status */}
        <Card className="border-card-border">
          <CardHeader><h3 className="font-semibold">Case Status Breakdown</h3></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(summary?.byStatus as unknown[]||[]).map((s:unknown)=>(s as {label:string;count:number}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="label" tick={{fontSize:10}} angle={-45} textAnchor="end" height={80}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#1a56db" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Backlog Analysis */}
        <Card className="border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-semibold">Backlog Analysis</h3>
              <Badge variant={((backlog?.backlogRate as number)||0)>50?"danger":"warning"}>{String(backlog?.backlogRate||0)}% Backlog</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(backlog?.backlog as unknown[]||[]).map((b:unknown)=>(b as {range:string;count:number}))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis type="number" tick={{fontSize:11}}/>
                <YAxis type="category" dataKey="range" width={90} tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#dc2626" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Court Performance */}
        <Card className="border-card-border">
          <CardHeader><h3 className="font-semibold">Court Performance</h3></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={courts.map(c=>({name:(c as {code:string}).code,total:(c as {total:number}).total,active:(c as {active:number}).active,closed:(c as {closed:number}).closed}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="active" stackId="a" fill="#f59e0b" name="Active" radius={[0,0,0,0]}/>
                <Bar dataKey="closed" stackId="a" fill="#059669" name="Closed" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Judge Performance table */}
      {judges.length > 0 && (
        <Card className="mt-6 border-card-border">
          <CardHeader><h3 className="font-semibold">Judge Performance</h3></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead><tr className="border-b border-card-border bg-app">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Judge</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Total Cases</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Closed</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Pending</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Disposition Rate</th>
              </tr></thead>
              <tbody>
                {judges.map((j:Record<string,unknown>) => (
                  <tr key={j.id as string} className="border-b border-border-light hover:bg-app">
                    <td className="px-5 py-3 font-medium text-sm">{j.name as string}</td>
                    <td className="px-5 py-3 text-right text-sm">{String(j.totalCases)}</td>
                    <td className="px-5 py-3 text-right text-sm text-emerald-600">{String(j.closed)}</td>
                    <td className="px-5 py-3 text-right text-sm text-amber-600">{String(j.pending)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium">{String(j.dispositionRate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
