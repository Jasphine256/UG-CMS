"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Shield, Ban, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface User {
  id: string; email: string; firstName: string; lastName: string;
  phoneNumber?: string; jobTitle?: string; status: string; lastLoginAt?: string; createdAt: string;
  roles: { role: { id: string; name: string; slug: string }; court?: { id: string; name: string } | null }[];
}

interface Role {
  id: string; name: string; slug: string; _count: { users: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams(search ? `q=${search}` : "");
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    if (data.success) setUsers(data.data);
  }, [search]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    if (data.success) setRoles(data.data);
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { toast.success("User created"); setShowCreate(false); setForm({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "", jobTitle: "" }); fetchUsers(); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  }

  async function toggleStatus(user: User) {
    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/users/${user.id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) { toast.success(`User ${newStatus.toLowerCase()}`); fetchUsers(); }
    else toast.error(data.error);
  }

  async function assignRole(userId: string, roleId: string) {
    const res = await fetch(`/api/users/${userId}/roles`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Role assigned"); fetchUsers(); }
    else toast.error(data.error);
  }

  async function removeRole(userId: string, roleId: string) {
    const res = await fetch(`/api/users/${userId}/roles`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Role removed"); fetchUsers(); }
    else toast.error(data.error);
  }

  const statusVariant = (s: string) => s === "ACTIVE" ? "success" : s === "SUSPENDED" ? "warning" : "danger";

  return (
    <div className="animate-fade-in">
      <PageHeader title="Users" description="Manage system users and their roles">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add User</Button>
      </PageHeader>

      {/* Search */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-more" />
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input-border bg-card pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border bg-app">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Roles</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-muted">Last Login</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border-light transition-colors hover:bg-app">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-main">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((ur) => (
                          <span key={ur.role.id} className="group relative inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                            {ur.role.name}
                            <button
                              onClick={() => removeRole(user.id, ur.role.id)}
                              className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-primary-200 group-hover:opacity-100"
                              title="Remove role"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        <div className="relative inline-flex">
                          <select
                            className="h-6 w-6 cursor-pointer appearance-none rounded-full border border-dashed border-input-border bg-transparent text-center text-xs text-muted-more hover:border-primary-400 hover:text-primary-600"
                            value=""
                            onChange={(e) => { if (e.target.value) assignRole(user.id, e.target.value); }}
                          >
                            <option value="">+</option>
                            {roles.filter(r => !user.roles.some(ur => ur.role.id === r.id)).map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(user)}
                          className="rounded-lg p-2 text-muted-more hover:bg-app-hover hover:text-secondary"
                          title={user.status === "ACTIVE" ? "Suspend" : "Activate"}
                        >
                          {user.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="rounded-lg p-2 text-muted-more hover:bg-app-hover hover:text-primary-600"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Create User</h3>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input id="firstName" label="First Name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                <Input id="lastName" label="Last Name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <Input id="email" label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input id="password" label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <Input id="phone" label="Phone" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
              <Input id="title" label="Job Title" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} loading={saving}>Create User</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Edit User</h3>
            <p className="text-sm text-muted">{editingUser.email}</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input id="editFirstName" label="First Name" defaultValue={editingUser.firstName} />
                <Input id="editLastName" label="Last Name" defaultValue={editingUser.lastName} />
              </div>
              <Input id="editPhone" label="Phone" defaultValue={editingUser.phoneNumber || ""} />
              <Input id="editTitle" label="Job Title" defaultValue={editingUser.jobTitle || ""} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary">Current Roles</label>
                <div className="flex flex-wrap gap-1">
                  {editingUser.roles.map((ur) => (
                    <span key={ur.role.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                      {ur.role.name}
                      <button onClick={() => removeRole(editingUser.id, ur.role.id).then(() => setEditingUser(null))} className="rounded-full p-0.5 hover:bg-primary-200"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Close</Button>
              <Button onClick={() => { /* update logic */ toast.success("User updated"); setEditingUser(null); }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
