"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, FeedbackItem } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { TableSkeleton } from "@/components/table-skeleton";
import { toast } from "sonner";

export default function ReportesPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | "bug" | "sugerencia">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pendiente" | "revisado">("all");
  const [page, setPage] = useState(0);
  const token = auth.getToken();

  const PAGE_SIZE = 20;
  const filtered = items
    .filter((i) => filterType === "all" || i.type === filterType)
    .filter((i) => filterStatus === "all" || i.status === filterStatus);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (!token) return;
    api.getFeedback(token)
      .then(setItems)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          auth.removeToken();
          router.push("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  const handleMarkReviewed = async (id: string) => {
    if (!token) return;
    setUpdating(id);
    try {
      await api.updateFeedbackStatus(token, id, "revisado");
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: "revisado" } : item));
      toast.success("Reporte marcado como revisado");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al actualizar"); }
    finally { setUpdating(null); }
  };

  return (
    <>
    <div>
      <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Reportes</h1>
      <div className="bg-white rounded-2xl border border-ss-input-border shadow-none overflow-hidden">
        <div className="p-4 border-b border-ss-input-border flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-ss-input-border overflow-hidden text-sm">
            {(["all", "bug", "sugerencia"] as const).map((v) => (
              <button key={v} onClick={() => { setFilterType(v); setPage(0); }}
                className={`px-3 py-1.5 transition-colors ${filterType === v ? "bg-ss-primary text-white" : "text-ss-text-muted hover:bg-ss-background"}`}>
                {v === "all" ? "Todos" : v === "bug" ? "Bugs" : "Sugerencias"}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-lg border border-ss-input-border overflow-hidden text-sm">
            {(["all", "pendiente", "revisado"] as const).map((v) => (
              <button key={v} onClick={() => { setFilterStatus(v); setPage(0); }}
                className={`px-3 py-1.5 transition-colors ${filterStatus === v ? "bg-ss-primary text-white" : "text-ss-text-muted hover:bg-ss-background"}`}>
                {v === "all" ? "Todos" : v === "pendiente" ? "Pendientes" : "Revisados"}
              </button>
            ))}
          </div>
          <span className="text-xs text-ss-text-muted ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={4} /></div>
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
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-ss-text-muted">Sin resultados</td></tr>
                )}
                {pageItems.map((item) => (
                  <tr key={item.id} className="hover:bg-ss-background/50">
                    <td className="px-4 py-3 text-ss-text-muted">{item.user_email}</td>
                    <td className="px-4 py-3">
                      <Badge className={item.type === "bug" ? "bg-red-100 text-ss-error border-0" : "bg-blue-100 text-ss-primary border-0"}>
                        {item.type === "bug" ? "Bug" : "Sugerencia"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="font-medium text-ss-primary hover:underline text-left truncate block w-full"
                        title={item.title}
                      >
                        {item.title}
                      </button>
                    </td>
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-ss-input-border flex items-center justify-between text-sm text-ss-text-muted">
            <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
      <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={selectedItem?.type === "bug" ? "bg-red-100 text-ss-error border-0" : "bg-blue-100 text-ss-primary border-0"}>
                {selectedItem?.type === "bug" ? "Bug" : "Sugerencia"}
              </Badge>
              <Badge className={selectedItem?.status === "revisado" ? "bg-green-100 text-green-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                {selectedItem?.status === "revisado" ? "Revisado" : "Pendiente"}
              </Badge>
              <span className="text-xs text-ss-text-muted ml-auto">{formatDate(selectedItem?.created_at ?? null)}</span>
            </div>
            <p className="text-xs text-ss-text-muted">{selectedItem?.user_email}</p>
            <p className="text-sm text-ss-text-dark whitespace-pre-wrap leading-relaxed">{selectedItem?.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
