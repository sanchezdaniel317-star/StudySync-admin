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

export default function ReportesPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
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
    <>
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
