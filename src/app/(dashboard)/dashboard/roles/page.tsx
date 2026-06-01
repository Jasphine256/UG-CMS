"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Shield, Check, X, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface Role {
  id: string; name: string; slug: string; description?: string; hierarchy: number;
  isSystem: boolean; _count: { users: number };
  permissions: { permission: { id: string; resource: string; action: string } }[];
}

interface Permission {
  id: string; resource: string; action: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<{ all: Permission[]; grouped: Record<string, Permission[]> }>({ all: [], grouped: {} });
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", hierarchy: "50" });
  const [saving, setSaving] = useState(false);
  const [permMatrix, setPermMatrix] = useState<Set<string>>(new Set());

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    if (data.success) setRoles(data.data);
  }, []);

  const fetchPermissions = useCallback(async () => {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    if (data.success) setPermissions(data.data);
  }, []);

  useEffect(() => { fetchRoles(); fetchPermissions(); setLoading(false); }, [fetchRoles, fetchPermissions]);

  function selectRole(role: Role) {
    setSelectedRole(role);
    setPermMatrix(new Set(role.permissions.map(p => p.permission.id)));
  }

  function togglePerm(permId: string) {
    setPermMatrix(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(permMatrix) }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Permissions updated"); fetchRoles(); }
    } finally { setSaving(false); }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { toast.success("Role created"); setShowCreate(false); fetchRoles(); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  }

  async function deleteRole(role: Role) {
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Role deleted"); fetchRoles(); if (selectedRole?.id === role.id) setSelectedRole(null); }
    else toast.error(data.error);
  }

  const resources = ["CASE", "USER", "ROLE", "COURT", "HEARING", "EVIDENCE", "DOCUMENT", "BAIL_APPLICATION", "APPEAL", "DETENTION", "INVESTIGATION", "NOTIFICATION", "AUDIT_LOG", "REPORT", "SETTINGS"];
  const actions = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "REJECT", "ASSIGN", "TRANSFER", "ARCHIVE", "EXPORT"];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Roles & Permissions" description="Manage roles and their access rights">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Role</Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <Card className="border-card-border">
          <CardHeader>
            <h3 className="font-semibold text-main">Roles</h3>
            <p className="text-xs text-muted">{roles.length} roles defined</p>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {loading ? (
              [1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)
            ) : roles.map((role) => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors",
                  selectedRole?.id === role.id ? "bg-primary-50 text-primary-700" : "hover:bg-app text-secondary"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    selectedRole?.id === role.id ? "bg-primary-100 text-primary-600" : "bg-app-hover text-muted"
                  )}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{role.name}</p>
                    <p className="text-xs text-muted-more">{role._count.users} users &middot; {role.permissions.length} perms</p>
                  </div>
                </div>
                {role.isSystem && <Badge variant="secondary" size="sm">System</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permission Matrix */}
        <Card className="border-card-border lg:col-span-2">
          {selectedRole ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between w-full">
                  <div>
                    <h3 className="font-semibold text-main">{selectedRole.name}</h3>
                    <p className="text-xs text-muted">{selectedRole.description || "No description"}</p>
                  </div>
                  <div className="flex gap-2">
                    {!selectedRole.isSystem && (
                      <Button variant="danger" size="sm" onClick={() => deleteRole(selectedRole)}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    )}
                    <Button size="sm" onClick={savePermissions} loading={saving}>
                      <Check className="h-3 w-3" /> Save Permissions
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-card-border bg-app">
                        <th className="sticky left-0 z-10 bg-app px-4 py-2 text-left text-xs font-semibold uppercase text-muted">Resource</th>
                        {actions.map(a => (
                          <th key={a} className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-muted-more">{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((resource) => (
                        <tr key={resource} className="border-b border-border-light transition-colors hover:bg-app">
                          <td className="sticky left-0 bg-card px-4 py-2.5 text-xs font-medium text-secondary">{resource.replace(/_/g, " ")}</td>
                          {actions.map((action) => {
                            const perm = permissions.all.find(p => p.resource === resource && p.action === action);
                            const isSet = perm && permMatrix.has(perm.id);
                            return (
                              <td key={action} className="px-2 py-2.5 text-center">
                                {perm ? (
                                  <button
                                    onClick={() => togglePerm(perm.id)}
                                    className={cn(
                                      "mx-auto flex h-6 w-6 items-center justify-center rounded transition-all",
                                      isSet ? "bg-primary-600 text-white hover:bg-primary-700" : "bg-app-hover text-muted-more hover:bg-app-hover hover:text-muted"
                                    )}
                                  >
                                    {isSet ? <Check className="h-3 w-3" /> : <span className="text-[10px]">-</span>}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-muted-more">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Shield className="mx-auto h-10 w-10 text-muted-more" />
                <p className="mt-3 text-sm text-muted">Select a role to manage its permissions</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Create Role Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Create Role</h3>
            <div className="mt-4 space-y-3">
              <Input id="rName" label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Data Entry Clerk" />
              <Input id="rSlug" label="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g., data_entry_clerk" />
              <Input id="rDesc" label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Input id="rHier" label="Hierarchy (lower = more power)" type="number" value={form.hierarchy} onChange={e => setForm(f => ({ ...f, hierarchy: e.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} loading={saving}>Create Role</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
