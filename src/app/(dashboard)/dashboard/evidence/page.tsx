"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Package, ArrowRight, Shield, CheckCircle } from "lucide-react";

const EVIDENCE_TYPES = [
  {value:"DOCUMENT",label:"Document"},{value:"PHYSICAL_EXHIBIT",label:"Physical Exhibit"},
  {value:"DIGITAL",label:"Digital"},{value:"PHOTOGRAPH",label:"Photograph"},
  {value:"VIDEO",label:"Video"},{value:"FORENSIC",label:"Forensic"},{value:"OTHER",label:"Other"},
];

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedEv, setSelectedEv] = useState<Record<string,unknown>|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ caseId:"", description:"", evidenceType:"PHYSICAL_EXHIBIT", exhibitNumber:"", location:"", collectedBy:"" });

  const fetchEvidence = useCallback(async () => {
    const res = await fetch("/api/evidence?limit=30");
    const d = await res.json();
    if (d.success) setEvidence(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  async function registerEvidence() {
    if (!form.caseId || !form.description) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/evidence", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success("Evidence registered"); setShowRegister(false); fetchEvidence(); }
    setSaving(false);
  }

  async function viewDetail(id: string) {
    const res = await fetch(`/api/evidence/${id}`);
    const d = await res.json();
    if (d.success) setSelectedEv(d.data);
  }

  async function submitToCourt(id: string) {
    const res = await fetch(`/api/evidence/${id}/submit`, { method:"POST" });
    const d = await res.json();
    if (d.success) { toast.success("Submitted to court"); fetchEvidence(); if (selectedEv) setSelectedEv(null); }
  }

  const statusVariant = (s:string) => {
    const m:Record<string,"success"|"warning"|"info"|"danger"|"secondary"> = { IN_CUSTODY:"info", SUBMITTED_TO_COURT:"warning", ADMITTED:"success", RETURNED:"secondary", DESTROYED:"danger", LOST:"danger" };
    return m[s]||"secondary";
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Evidence" description="Manage evidence and chain of custody">
        <Button onClick={()=>setShowRegister(true)}><Plus className="h-4 w-4"/> Register Evidence</Button>
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div> : evidence.length===0 ? (
            <div className="py-16 text-center"><Package className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No evidence registered</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {evidence.map((ev:Record<string,unknown>) => (
                <div key={ev.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app cursor-pointer" onClick={()=>viewDetail(ev.id as string)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Package className="h-5 w-5 text-amber-600"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-primary-600">{ev.exhibitNumber as string}</span>
                      <Badge variant={statusVariant(ev.status as string)}>{(ev.status as string)?.replace(/_/g," ")}</Badge>
                    </div>
                    <p className="text-sm text-secondary truncate">{ev.description as string}</p>
                    <p className="text-xs text-muted-more">{(ev.case as {caseNumber?:string})?.caseNumber} · {(ev.evidenceType as string)}</p>
                  </div>
                  <div className="flex gap-1">
                    {(ev.status as string)==="IN_CUSTODY" && <Button size="sm" variant="outline" onClick={e=>{e.stopPropagation();submitToCourt(ev.id as string);}}>Submit to Court</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register dialog */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowRegister(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Register Evidence</h3>
            <div className="mt-4 space-y-3">
              <Input id="evCase" label="Case ID *" value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))} />
              <div><label className="mb-1.5 block text-sm font-medium text-secondary">Description *</label><textarea className="flex w-full rounded-lg border border-input-border p-2 text-sm" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
              <Select id="evType" label="Type" options={EVIDENCE_TYPES} value={form.evidenceType} onChange={e=>setForm(f=>({...f,evidenceType:e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <Input id="evEx" label="Exhibit No." value={form.exhibitNumber} onChange={e=>setForm(f=>({...f,exhibitNumber:e.target.value}))} placeholder="e.g., PE-001" />
                <Input id="evLoc" label="Location" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Storage location" />
              </div>
              <Input id="evBy" label="Collected By" value={form.collectedBy} onChange={e=>setForm(f=>({...f,collectedBy:e.target.value}))} />
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setShowRegister(false)}>Cancel</Button><Button onClick={registerEvidence} loading={saving}>Register</Button></div>
          </div>
        </div>
      )}

      {/* Detail dialog with chain of custody */}
      {selectedEv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setSelectedEv(null)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Evidence Detail</h3>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-muted">Exhibit:</span> <span className="font-mono font-medium">{selectedEv.exhibitNumber as string}</span></p>
              <p><span className="text-muted">Type:</span> {(selectedEv.evidenceType as string)}</p>
              <p><span className="text-muted">Status:</span> <Badge variant={statusVariant(selectedEv.status as string)}>{(selectedEv.status as string)?.replace(/_/g," ")}</Badge></p>
              <p><span className="text-muted">Case:</span> {String((selectedEv.case as {caseNumber?:string})?.caseNumber || "")}</p>
              <p><span className="text-muted">Description:</span> {String(selectedEv.description || "")}</p>
              <p><span className="text-muted">Location:</span> {String(selectedEv.location || "N/A")}</p>
            </div>

            {/* Chain of Custody */}
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary"><Shield className="h-4 w-4"/> Chain of Custody</h4>
              <div className="space-y-3">
                {((selectedEv.custodyChain as unknown[])||[]).map((c:unknown, i:number) => {
                  const ch = c as Record<string,unknown>;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-card-border p-3 text-sm">
                      <ArrowRight className="h-4 w-4 text-muted-more shrink-0"/>
                      <div className="flex-1">
                        <p className="font-medium text-secondary">{(ch.fromUser as {firstName?:string;lastName?:string})?.firstName} → {(ch.toUser as {firstName?:string;lastName?:string})?.firstName}</p>
                        <p className="text-xs text-muted">{ch.purpose as string} · {new Date(ch.transferDate as string).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={()=>setSelectedEv(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
