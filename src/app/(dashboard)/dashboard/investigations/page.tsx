"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Plus, User, Building, Shield, Calendar } from "lucide-react";

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stations, setStations] = useState<{value:string;label:string}[]>([]);
  const [officers, setOfficers] = useState<{value:string;label:string}[]>([]);
  const [form, setForm] = useState({ caseId: "", policeStationId: "", assignedOfficerId: "", supervisingOfficerId: "", pgiProsecutorId: "", startDate: new Date().toISOString().split("T")[0] });

  const fetchData = useCallback(async () => {
    const [invRes, stRes, usRes] = await Promise.all([
      fetch("/api/investigations?limit=30"), fetch("/api/courts"), fetch("/api/users?limit=100"),
    ]);
    const inv = await invRes.json(); const st = await stRes.json(); const us = await usRes.json();
    if (inv.success) setInvestigations(inv.data);
    if (st.success) setStations(st.data.filter((c:{level:string})=>["HIGH_COURT","CHIEF_MAGISTRATE"].includes(c.level)).map((c:{id:string;name:string})=>({value:c.id,label:c.name})));
    if (us.success) setOfficers(us.data.filter((u:{roles?:{role?:{slug?:string}}[]})=>u.roles?.some((r:{role?:{slug?:string}})=>r.role?.slug?.includes("police")||r.role?.slug?.includes("prosecutor")||r.role?.slug?.includes("admin"))).map((u:{id:string;firstName:string;lastName:string})=>({value:u.id,label:`${u.firstName} ${u.lastName}`})));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createInv() {
    if (!form.policeStationId || !form.assignedOfficerId) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/investigations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success("Investigation created"); setShowCreate(false); fetchData(); }
    else toast.error(d.error);
    setSaving(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Investigations" description="Track police investigations and PGI cases">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Investigation</Button>
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div> : investigations.length===0 ? (
            <div className="py-16 text-center"><Search className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No investigations yet</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {investigations.map((inv:Record<string,unknown>) => (
                <div key={inv.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><Search className="h-5 w-5 text-blue-600"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-main">{(inv.assignedOfficer as {firstName?:string;lastName?:string})?.firstName} {(inv.assignedOfficer as {firstName?:string;lastName?:string})?.lastName}</p>
                      <Badge variant={inv.status==="ACTIVE"?"success":"secondary"}>{(inv.status as string)}</Badge>
                    </div>
                    <p className="text-sm text-muted">{(inv.policeStation as {name?:string})?.name} · Started {new Date(inv.startDate as string).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-more">{(inv._count as {evidence?:number})?.evidence||0} evidence items</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">New Investigation</h3>
            <div className="mt-4 space-y-3">
              <Input id="invCase" label="Case ID" value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))} placeholder="Optional" />
              <Select id="invStation" label="Police Station *" options={[{value:"",label:"Select..."},...stations]} value={form.policeStationId} onChange={e=>setForm(f=>({...f,policeStationId:e.target.value}))} />
              <Select id="invOfficer" label="Assigned Officer *" options={[{value:"",label:"Select..."},...officers]} value={form.assignedOfficerId} onChange={e=>setForm(f=>({...f,assignedOfficerId:e.target.value}))} />
              <Select id="invSuper" label="Supervising Officer" options={[{value:"",label:"None"},...officers]} value={form.supervisingOfficerId} onChange={e=>setForm(f=>({...f,supervisingOfficerId:e.target.value}))} />
              <Select id="invPGI" label="PGI Prosecutor" options={[{value:"",label:"None"},...officers]} value={form.pgiProsecutorId} onChange={e=>setForm(f=>({...f,pgiProsecutorId:e.target.value}))} />
              <Input id="invDate" label="Start Date" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} />
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button><Button onClick={createInv} loading={saving}>Create</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
