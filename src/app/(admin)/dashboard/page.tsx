"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, AdminUser } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-6 border border-ss-input-border shadow-none">
      <p className="text-sm font-medium text-ss-text-muted mb-2">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { router.push("/login"); return; }
    api.getUsers(token)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          auth.removeToken();
          router.push("/login");
        } else {
          setError(err.message ?? "Error al conectar con el servidor");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const now = new Date();
  const newThisMonth = users.filter((u) => {
    if (!u.created_at) return false;
    const d = new Date(u.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-ss-text-muted">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-ss-error bg-red-50 rounded-lg px-4 py-3">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard label="Total de usuarios" value={users.length} color="text-ss-primary" />
          <StatCard label="Usuarios bloqueados" value={users.filter((u) => u.is_blocked).length} color="text-ss-error" />
          <StatCard label="Nuevos este mes" value={newThisMonth} color="text-green-600" />
        </div>
      )}
    </div>
  );
}
