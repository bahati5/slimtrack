"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  ShieldCheck,
  Users as UsersIcon,
  UserCircle2,
  ChevronRight,
} from "lucide-react";

export interface AdminUser {
  id: string;
  role: "user" | "coach" | "admin";
  full_name: string | null;
  avatar_url: string | null;
  coach_id: string | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  created_at: string;
}

export function AdminUsersView({
  users,
  coaches,
  meId,
}: {
  users: AdminUser[];
  coaches: AdminUser[];
  meId: string;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<AdminUser[]>(users);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(needle) ||
        u.id.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, roleFilter]);

  async function updateRole(id: string, role: AdminUser["role"]) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role } : u)),
    );
    toast.success("Rôle mis à jour");
  }

  async function updateCoach(id: string, coachId: string | null) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ coach_id: coachId })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((u) => (u.id === id ? { ...u, coach_id: coachId } : u)),
    );
    toast.success("Coach assigné");
  }

  const counts = useMemo(() => {
    const c = { user: 0, coach: 0, admin: 0 };
    for (const u of rows) c[u.role]++;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatCard label="Utilisateurs" value={counts.user} tone="info" />
        <StatCard label="Coachs" value={counts.coach} tone="success" />
        <StatCard label="Admins" value={counts.admin} tone="primary" />
      </div>

      {/* Filtres */}
      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <Input
            className="pl-11"
            placeholder="Chercher par nom ou ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tous rôles</option>
          <option value="user">Utilisateur</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </Select>
      </Card>

      {/* Liste */}
      <ul className="space-y-2">
        {filtered.map((u) => (
          <li key={u.id}>
            <Card className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-10 shrink-0 rounded-full bg-gradient-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {u.full_name ?? "Sans nom"}
                    </span>
                    {u.id === meId && <Badge tone="neutral">Toi</Badge>}
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="truncate font-mono text-[10px] text-[var(--color-muted)]">
                    {u.id}
                  </div>
                </div>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="rounded-full p-2 text-[var(--color-muted)] hover:bg-[var(--color-card-soft)] hover:text-[var(--color-primary-soft)]"
                  aria-label="Détails"
                >
                  <ChevronRight className="size-5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Rôle</Label>
                  <Select
                    value={u.role}
                    onChange={(e) =>
                      updateRole(u.id, e.target.value as AdminUser["role"])
                    }
                    disabled={u.id === meId}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Coach assigné</Label>
                  <Select
                    value={u.coach_id ?? ""}
                    onChange={(e) =>
                      updateCoach(u.id, e.target.value || null)
                    }
                  >
                    <option value="">—</option>
                    {coaches
                      .filter((c) => c.id !== u.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name ?? c.id.slice(0, 8)}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>
            </Card>
          </li>
        ))}
        {filtered.length === 0 && (
          <Card className="border-dashed">
            <CardTitle>Aucun résultat</CardTitle>
          </Card>
        )}
      </ul>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  if (role === "admin")
    return (
      <Badge tone="primary">
        <ShieldCheck className="size-3" /> admin
      </Badge>
    );
  if (role === "coach")
    return (
      <Badge tone="success">
        <UsersIcon className="size-3" /> coach
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <UserCircle2 className="size-3" /> user
    </Badge>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "info" | "success" | "primary";
}) {
  const toneClass =
    tone === "primary"
      ? "text-[var(--color-primary-soft)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-info)]";
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-3">
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
