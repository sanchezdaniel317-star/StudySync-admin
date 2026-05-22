"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, AdminUser, FeedbackItem } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart as ReBarChart, Bar,
  AreaChart as ReAreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getMonthlyRegistrations(users: AdminUser[]) {
  const counts: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = 0;
  }
  users.forEach((u) => {
    if (!u.created_at) return;
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in counts) counts[key]++;
  });
  return Object.entries(counts).map(([key, count]) => {
    const month = parseInt(key.split("-")[1]) - 1;
    return { label: MONTH_NAMES[month], value: count };
  });
}

function getMonthlyFeedback(items: FeedbackItem[]) {
  const counts: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = 0;
  }
  items.forEach((item) => {
    if (!item.created_at) return;
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in counts) counts[key]++;
  });
  return Object.entries(counts).map(([key, count]) => {
    const month = parseInt(key.split("-")[1]) - 1;
    return { label: MONTH_NAMES[month], value: count };
  });
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-6 border border-ss-input-border shadow-none">
      <p className="text-sm font-medium text-ss-text-muted mb-2">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}

function MonthlyBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={112}>
      <ReBarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#056CF2" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#3D9DF2" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6B7A99" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B7A99" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #D0D9E8",
            fontSize: "12px",
          }}
          cursor={{ fill: "#056CF2", opacity: 0.06 }}
        />
        <Bar
          dataKey="value"
          fill="url(#barGradient)"
          radius={[4, 4, 0, 0]}
          isAnimationActive
        />
      </ReBarChart>
    </ResponsiveContainer>
  );
}

function FeedbackAreaChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={112}>
      <ReAreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#056CF2" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#056CF2" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EEF4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7A99" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6B7A99" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #D0D9E8", fontSize: "12px" }} />
        <Area type="monotone" dataKey="value" stroke="#056CF2" strokeWidth={2} fill="url(#areaGradient)" isAnimationActive />
      </ReAreaChart>
    </ResponsiveContainer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border border-ss-input-border rounded-xl">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 border border-ss-input-border rounded-xl sm:col-span-2">
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="p-6 border border-ss-input-border rounded-xl">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-10 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = auth.getToken();
    if (!token) return;
    Promise.all([
      api.getUsers(token),
      api.getFeedback(token),
    ])
      .then(([u, f]) => { setUsers(u); setFeedback(f); })
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

  const monthlyData = getMonthlyRegistrations(users);
  const feedbackMonthlyData = getMonthlyFeedback(feedback);
  const pendingReports = feedback.filter((f) => f.status === "pendiente").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Dashboard</h1>
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <p className="text-sm text-ss-error bg-red-50 rounded-lg px-4 py-3">{error}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard label="Total de usuarios" value={users.length} color="text-ss-primary" />
            <StatCard label="Usuarios bloqueados" value={users.filter((u) => u.is_blocked).length} color="text-ss-error" />
            <StatCard label="Nuevos este mes" value={newThisMonth} color="text-green-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="p-6 border border-ss-input-border shadow-none sm:col-span-2">
              <p className="text-sm font-medium text-ss-text-muted mb-4">Registros por mes (últimos 6 meses)</p>
              <MonthlyBarChart data={monthlyData} />
            </Card>

            <Link href="/reportes" className="block">
              <Card className="p-6 border border-ss-input-border shadow-none h-full hover:border-ss-primary transition-colors cursor-pointer">
                <p className="text-sm font-medium text-ss-text-muted mb-2">Reportes pendientes</p>
                <p className={`text-4xl font-bold ${pendingReports > 0 ? "text-amber-500" : "text-green-600"}`}>
                  {pendingReports}
                </p>
                <p className="text-xs text-ss-text-muted mt-3">
                  {pendingReports > 0 ? "Haz clic para revisarlos →" : "Todo al día ✓"}
                </p>
              </Card>
            </Link>
          </div>

          <Card className="p-6 border border-ss-input-border shadow-none">
            <p className="text-sm font-medium text-ss-text-muted mb-4">Feedback por mes (últimos 6 meses)</p>
            <FeedbackAreaChart data={feedbackMonthlyData} />
          </Card>
        </div>
      )}
    </div>
  );
}
