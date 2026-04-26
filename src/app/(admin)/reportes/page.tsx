"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, FeedbackItem } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function ReportesPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const token = auth.getToken();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    api.getFeedback(token)
      .then(setItems)
      .catch(() => { auth.removeToken(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router, token]);

  const handleMarkReviewed = async (id: string) => {
    if (!token) return;
    setUpdating(id);
    try {
      await api.updateFeedbackStatus(token, id, "revisado");
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: "revisado" } : item));
    } catch (e) { alert(e instanceof Error ? e.message : "Error al actualizar"); }
    finally { setUpdating(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Reportes</h1>
      <div className="bg-white rounded-2xl border border-ss-input-border shadow-none overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ss-text-muted">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ss-background text-ss-text-muted">
                <tr>
                  {["Usuario", "Tipo", "Título", "Descripción", "Fecha", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ss-input-border">
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-ss-text-muted">Sin reportes</td></tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-ss-background/50">
                    <td className="px-4 py-3 text-ss-text-muted">{item.user_email}</td>
                    <td className="px-4 py-3">
                      <Badge className={item.type === "bug" ? "bg-red-100 text-ss-error border-0" : "bg-blue-100 text-ss-primary border-0"}>
                        {item.type === "bug" ? "Bug" : "Sugerencia"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-ss-text-dark max-w-[180px] truncate">{item.title}</td>
                    <td className="px-4 py-3 text-ss-text-muted max-w-[240px] truncate" title={item.description}>{item.description}</td>
                    <td className="px-4 py-3 text-ss-text-muted whitespace-nowrap">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge className={item.status === "revisado" ? "bg-green-100 text-green-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                        {item.status === "revisado" ? "Revisado" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "pendiente" && (
                        <Button size="sm" variant="outline" disabled={updating === item.id}
                          onClick={() => handleMarkReviewed(item.id)}
                          className="text-xs border-ss-input-border hover:border-ss-primary hover:text-ss-primary">
                          {updating === item.id ? "..." : "Marcar revisado"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
