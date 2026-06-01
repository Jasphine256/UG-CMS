"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Handshake, User, Check, X } from "lucide-react";

export default function BailPage() {
  const [applications, setApplications] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFile, setShowFile] = useState(false);
  const [decideId, setDecideId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ caseId:"", applicantId:"", bailAmount:"", isCashBail:false, conditions:"" });
  const [decForm, setDecForm] = useState({ decision:"GRANTED", decisionReason:"" });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/bail?limit=30");
    const d = await res.json();
    if (d.success) setApplications(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function fileBail() {
    if (!form.caseId || !form.applicantId) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/bail", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, bailAmount:form.bailAmount?parseFloat(form.bailAmount):null}) });
    const d = await res.json();
    if (d.success) { toast.success("Bail application filed"); setShowFile(false); fetchData(); }
    setSaving(false);
  }

  async function decide() {
    if (!decideId) return;
    setSaving(true);
    const res = await fetch(`/api/bail/${decideId}/decide`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(decForm) });
    const d = await res.json();
    if (d.success) { toast.success(`Bail ${decForm.decision.toLowerCase()}`); setDecideId(null); fetchData(); }
    setSaving(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Bail Applications" description="Manage bail applications and sureties">
        <Button onClick={()=>setShowFile(true)}><Plus className="h-4 w-4"/> File Bail Application</Button>
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-20 w-full"/>)}</div> : applications.length===0 ? (
            <div className="py-16 text-center"><Handshake className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No bail applications</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {applications.map((a:Record<string,unknown>) => (
                <div key={a.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Handshake className="h-5 w-5 text-amber-600"/></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{(a.case as {caseNumber?:string})?.caseNumber}</p>
                      {a.decision ? <Badge variant={a.decision==="GRANTED"?"success":"danger"}>{(a.decision as string)}</Badge> : <Badge variant="warning">Pending</Badge>}
                    </div>
                    <p className="text-sm text-secondary">{(a.case as {title?:string})?.title}</p>
                    <p className="text-xs text-muted-more">Filed {new Date(a.filingDate as string).toLocaleDateString()} · {(a.sureties as unknown[] || []).length} sureties</p>
                  </div>
                  {!a.decision && (
                    <Button size="sm" onClick={()=>setDecideId(a.id as string)}>Decide</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File dialog */}
      {showFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowFile(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">File Bail Application</h3>
            <div className="mt-4 space-y-3">
              <Input id="bCaseId" label="Case ID *" value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))} />
              <Input id="bAppId" label="Applicant ID *" value={form.applicantId} onChange={e=>setForm(f=>({...f,applicantId:e.target.value}))} />
              <Input id="bAmount" label="Bail Amount (UGX)" type="number" value={form.bailAmount} onChange={e=>setForm(f=>({...f,bailAmount:e.target.value}))} />
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Conditions</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={2} value={form.conditions} onChange={e=>setForm(f=>({...f,conditions:e.target.value}))}/></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setShowFile(false)}>Cancel</Button><Button onClick={fileBail} loading={saving}>File Application</Button></div>
          </div>
        </div>
      )}

      {/* Decide dialog */}
      {decideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setDecideId(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Decide Bail</h3>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                {["GRANTED","DENIED"].map(d=>(<Button key={d} variant={decForm.decision===d?"default":"outline"} onClick={()=>setDecForm(f=>({...f,decision:d}))}>{d==="GRANTED"?<Check className="h-4 w-4"/>:<X className="h-4 w-4"/>} {d}</Button>))}
              </div>
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Reason</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={2} value={decForm.decisionReason} onChange={e=>setDecForm(f=>({...f,decisionReason:e.target.value}))}/></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setDecideId(null)}>Cancel</Button><Button onClick={decide} loading={saving}>Confirm Decision</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
