"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Scale, Plus, CheckCircle, XCircle } from "lucide-react";

const OUTCOMES = [
  {value:"ALLOWED",label:"Allowed"},{value:"DISMISSED",label:"Dismissed"},{value:"VARY_SENTENCE",label:"Vary Sentence"},
  {value:"REMAND_FOR_RETRIAL",label:"Remand for Retrial"},{value:"PARTIALLY_ALLOWED",label:"Partially Allowed"},{value:"STRUCK_OUT",label:"Struck Out"},
];

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFile, setShowFile] = useState(false);
  const [decideId, setDecideId] = useState<string|null>(null);
  const [courts, setCourts] = useState<{value:string;label:string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ originalCaseId:"", assignedCourtId:"", appellantId:"", respondentId:"", appealType:"FIRST_APPEAL", groundsOfAppeal:"", reliefSought:"" });
  const [decForm, setDecForm] = useState({ outcome:"ALLOWED", reasoning:"", orderDetails:"" });

  const fetchData = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([fetch("/api/appeals?limit=30"),fetch("/api/courts")]);
    const a = await aRes.json(); const c = await cRes.json();
    if (a.success) setAppeals(a.data);
    if (c.success) setCourts(c.data.map((c:{id:string;name:string})=>({value:c.id,label:c.name})));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function fileAppeal() {
    if (!form.originalCaseId || !form.assignedCourtId) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/appeals", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success(`Appeal ${d.data.appealNumber} filed`); setShowFile(false); fetchData(); }
    else toast.error(d.error);
    setSaving(false);
  }

  async function decide() {
    if (!decideId) return;
    setSaving(true);
    const res = await fetch(`/api/appeals/${decideId}/decide`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(decForm) });
    const d = await res.json();
    if (d.success) { toast.success("Appeal decided"); setDecideId(null); fetchData(); }
    setSaving(false);
  }

  const outcomeVariant = (o:string) => {
    const m:Record<string,"success"|"danger"|"warning"|"info"> = { ALLOWED:"success", DISMISSED:"danger", VARY_SENTENCE:"warning", REMAND_FOR_RETRIAL:"info", PARTIALLY_ALLOWED:"warning", STRUCK_OUT:"danger" };
    return m[o]||"secondary";
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Appeals" description="Track appeals through Court of Appeal and Supreme Court">
        <Button onClick={()=>setShowFile(true)}><Plus className="h-4 w-4"/> File Appeal</Button>
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-20 w-full"/>)}</div> : appeals.length===0 ? (
            <div className="py-16 text-center"><Scale className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No appeals filed</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {appeals.map((a:Record<string,unknown>) => (
                <div key={a.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50"><Scale className="h-5 w-5 text-purple-600"/></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-primary-600">{a.appealNumber as string}</span>
                      <Badge variant={a.status==="DECIDED"?"success":a.status==="FILED"?"info":"warning"}>{(a.status as string)}</Badge>
                    </div>
                    <p className="text-sm text-secondary">{(a.originalCase as {caseNumber?:string;title?:string})?.caseNumber} · {(a.assignedCourt as {name?:string})?.name}</p>
                    {(a.decisions as unknown[] || []).length > 0 && <Badge variant={outcomeVariant(((a.decisions as unknown[])[0] as {outcome:string})?.outcome)}>{((a.decisions as unknown[])[0] as {outcome:string})?.outcome?.replace(/_/g," ")}</Badge>}
                  </div>
                  {a.status!=="DECIDED" && <Button size="sm" onClick={()=>setDecideId(a.id as string)}>Decide</Button>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File appeal dialog */}
      {showFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowFile(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">File Appeal</h3>
            <div className="mt-4 space-y-3">
              <Input id="aCaseId" label="Original Case ID *" value={form.originalCaseId} onChange={e=>setForm(f=>({...f,originalCaseId:e.target.value}))} />
              <Select id="aCourt" label="Assign to Court *" options={[{value:"",label:"Select..."},...courts]} value={form.assignedCourtId} onChange={e=>setForm(f=>({...f,assignedCourtId:e.target.value}))} />
              <Input id="aAppellant" label="Appellant ID" value={form.appellantId} onChange={e=>setForm(f=>({...f,appellantId:e.target.value}))} />
              <Input id="aResp" label="Respondent ID" value={form.respondentId} onChange={e=>setForm(f=>({...f,respondentId:e.target.value}))} />
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Grounds of Appeal *</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={3} value={form.groundsOfAppeal} onChange={e=>setForm(f=>({...f,groundsOfAppeal:e.target.value}))} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Relief Sought</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={2} value={form.reliefSought} onChange={e=>setForm(f=>({...f,reliefSought:e.target.value}))} /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setShowFile(false)}>Cancel</Button><Button onClick={fileAppeal} loading={saving}>File Appeal</Button></div>
          </div>
        </div>
      )}

      {/* Decide dialog */}
      {decideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setDecideId(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Appeal Decision</h3>
            <div className="mt-4 space-y-3">
              <Select id="decOutcome" label="Outcome" options={OUTCOMES} value={decForm.outcome} onChange={e=>setDecForm(f=>({...f,outcome:e.target.value}))} />
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Reasoning</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={3} value={decForm.reasoning} onChange={e=>setDecForm(f=>({...f,reasoning:e.target.value}))}/></div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setDecideId(null)}>Cancel</Button><Button onClick={decide} loading={saving}>Record Decision</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
