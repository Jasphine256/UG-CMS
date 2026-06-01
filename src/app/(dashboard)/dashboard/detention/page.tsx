"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Building2, ArrowRight, LogOut } from "lucide-react";

export default function DetentionPage() {
  const [records, setRecords] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [releaseId, setReleaseId] = useState<string|null>(null);
  const [transferId, setTransferId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ personId:"", caseId:"", facilityName:"", warrantNumber:"", warrantType:"" });
  const [relForm, setRelForm] = useState("");
  const [trForm, setTrForm] = useState({ toFacility:"", reason:"" });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/detention?limit=30");
    const d = await res.json();
    if (d.success) setRecords(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createRecord() {
    if (!form.personId || !form.caseId || !form.facilityName) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/detention", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success("Detention record created"); setShowCreate(false); fetchData(); }
    setSaving(false);
  }

  async function release() {
    if (!releaseId) return;
    setSaving(true);
    const res = await fetch(`/api/detention/${releaseId}/release`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({releaseReason:relForm}) });
    const d = await res.json();
    if (d.success) { toast.success("Released"); setReleaseId(null); fetchData(); }
    setSaving(false);
  }

  async function transfer() {
    if (!transferId) return;
    setSaving(true);
    const res = await fetch(`/api/detention/${transferId}/transfer`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(trForm) });
    const d = await res.json();
    if (d.success) { toast.success("Transferred"); setTransferId(null); fetchData(); }
    setSaving(false);
  }

  const statusVariant = (s:string) => {
    const m:Record<string,"warning"|"info"|"success"|"danger"|"secondary"> = { REMAND:"warning", SENTENCED:"info", BAILED:"success", TRANSFERRED:"secondary", RELEASED:"success", ESCAPED:"danger" };
    return m[s]||"secondary";
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Detention Records" description="Manage prison admissions, remand and releases">
        <Button onClick={()=>setShowCreate(true)}><Plus className="h-4 w-4"/> New Record</Button>
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div> : records.length===0 ? (
            <div className="py-16 text-center"><Building2 className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No detention records</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {records.map((r:Record<string,unknown>) => (
                <div key={r.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-hover"><Building2 className="h-5 w-5 text-muted"/></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{(r.case as {caseNumber?:string})?.caseNumber}</p>
                      <Badge variant={statusVariant(r.status as string)}>{(r.status as string)}</Badge>
                    </div>
                    <p className="text-sm text-muted">{String(r.facilityName)} · Admitted {new Date(r.admissionDate as string).toLocaleDateString()}</p>
                    {Boolean(r.warrantNumber) && <p className="text-xs text-muted-more">Warrant: {String(r.warrantNumber)}</p>}
                  </div>
                  <div className="flex gap-2">
                    {r.status==="REMAND" && <>
                      <Button size="sm" variant="outline" onClick={()=>setTransferId(r.id as string)}><ArrowRight className="h-3 w-3"/> Transfer</Button>
                      <Button size="sm" variant="default" onClick={()=>setReleaseId(r.id as string)}><LogOut className="h-3 w-3"/> Release</Button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">New Detention Record</h3>
            <div className="mt-4 space-y-3">
              <Input id="dPerson" label="Person ID *" value={form.personId} onChange={e=>setForm(f=>({...f,personId:e.target.value}))} />
              <Input id="dCase" label="Case ID *" value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))} />
              <Input id="dFac" label="Facility *" value={form.facilityName} onChange={e=>setForm(f=>({...f,facilityName:e.target.value}))} placeholder="e.g., Luzira Prison" />
              <Input id="dWarrant" label="Warrant Number" value={form.warrantNumber} onChange={e=>setForm(f=>({...f,warrantNumber:e.target.value}))} />
              <Input id="dWType" label="Warrant Type" value={form.warrantType} onChange={e=>setForm(f=>({...f,warrantType:e.target.value}))} placeholder="e.g., REMAND, COMMITTAL" />
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button><Button onClick={createRecord} loading={saving}>Create Record</Button></div>
          </div>
        </div>
      )}

      {/* Release dialog */}
      {releaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setReleaseId(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Release</h3>
            <div className="mt-4"><label className="mb-1.5 block text-sm font-medium text-secondary">Release Reason</label><textarea className="w-full rounded-lg border border-input-border p-2 text-sm" rows={2} value={relForm} onChange={e=>setRelForm(e.target.value)}/></div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setReleaseId(null)}>Cancel</Button><Button onClick={release} loading={saving}>Release</Button></div>
          </div>
        </div>
      )}

      {/* Transfer dialog */}
      {transferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setTransferId(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Transfer</h3>
            <div className="mt-4 space-y-3">
              <Input id="trTo" label="To Facility *" value={trForm.toFacility} onChange={e=>setTrForm(f=>({...f,toFacility:e.target.value}))} />
              <Input id="trReason" label="Reason" value={trForm.reason} onChange={e=>setTrForm(f=>({...f,reason:e.target.value}))} />
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setTransferId(null)}>Cancel</Button><Button onClick={transfer} loading={saving}>Transfer</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
