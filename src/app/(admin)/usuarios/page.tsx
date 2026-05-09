"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, AdminUser } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editCarrera, setEditCarrera] = useState("");
  const [saving, setSaving] = useState(false);
  const [warnUser, setWarnUser] = useState<AdminUser | null>(null);
  const [warnMessage, setWarnMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmBlockUser, setConfirmBlockUser] = useState<AdminUser | null>(null);
  const token = auth.getToken();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    api.getUsers(token)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          auth.removeToken();
          router.push("/login");
        } else {
          setFetchError(err.message ?? "Error al conectar con el servidor");
        }
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openEdit = (u: AdminUser) => { setEditUser(u); setEditName(u.name); setEditCarrera(u.carrera); };
  const handleEdit = async () => {
    if (!editUser || !token) return;
    setSaving(true);
    try {
      await api.updateUser(token, editUser.email, editName, editCarrera);
      setUsers((prev) => prev.map((u) => u.email === editUser.email ? { ...u, name: editName, carrera: editCarrera } : u));
      setEditUser(null);
    } catch (e) { alert(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  const openWarn = (u: AdminUser) => { setWarnUser(u); setWarnMessage(""); };
  const handleWarn = async () => {
    if (!warnUser || !token || !warnMessage.trim()) return;
    setSending(true);
    try {
      await api.sendNotification(token, warnUser.email, warnMessage.trim());
      setWarnUser(null);
    } catch (e) { alert(e instanceof Error ? e.message : "Error al enviar"); }
    finally { setSending(false); }
  };

  const handleBlock = async (u: AdminUser) => {
    if (!token) return;
    try {
      const { is_blocked } = await api.toggleBlock(token, u.email);
      setUsers((prev) => prev.map((x) => x.email === u.email ? { ...x, is_blocked } : x));
    } catch (e) { alert(e instanceof Error ? e.message : "Error al bloquear"); }
  };

  const handleDelete = async () => {
    if (!deleteUser || !token) return;
    setDeleting(true);
    try {
      await api.deleteUser(token, deleteUser.email);
      setUsers((prev) => prev.filter((u) => u.email !== deleteUser.email));
      setDeleteUser(null);
    } catch (e) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Usuarios</h1>
      <div className="bg-white rounded-2xl border border-ss-input-border shadow-none overflow-hidden">
        <div className="p-4 border-b border-ss-input-border">
          <Input placeholder="Buscar por nombre o email..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="max-w-xs border-ss-input-border" />
        </div>
        {loading ? (
          <div className="p-8 text-center text-ss-text-muted">Cargando...</div>
        ) : fetchError ? (
          <div className="p-8 text-center text-sm text-ss-error bg-red-50">{fetchError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ss-background text-ss-text-muted">
                <tr>
                  {["Nombre", "Email", "Carrera", "Registro", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ss-input-border">
                {pageItems.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-ss-text-muted">Sin usuarios</td></tr>
                )}
                {pageItems.map((u) => (
                  <tr key={u.email} className="hover:bg-ss-background/50">
                    <td className="px-4 py-3 font-medium text-ss-text-dark">{u.name}</td>
                    <td className="px-4 py-3 text-ss-text-muted">{u.email}</td>
                    <td className="px-4 py-3 text-ss-text-muted">{u.carrera || "—"}</td>
                    <td className="px-4 py-3 text-ss-text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge className={u.is_blocked ? "bg-red-100 text-ss-error border-0" : "bg-green-100 text-green-700 border-0"}>
                        {u.is_blocked ? "Bloqueado" : "Activo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title="Editar" onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-ss-background text-ss-text-muted hover:text-ss-primary transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button title="Advertencia" onClick={() => openWarn(u)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-ss-text-muted hover:text-amber-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                        <button title={u.is_blocked ? "Desbloquear" : "Bloquear"} onClick={() => setConfirmBlockUser(u)}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_blocked ? "hover:bg-green-50 text-green-600" : "hover:bg-red-50 text-ss-text-muted hover:text-ss-error"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {u.is_blocked ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            )}
                          </svg>
                        </button>
                        <button title="Eliminar" onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-ss-text-muted hover:text-ss-error transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nombre</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Carrera</Label><Input value={editCarrera} onChange={(e) => setEditCarrera(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-ss-primary hover:bg-ss-primary-dark text-white">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!warnUser} onOpenChange={(o) => !o && setWarnUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar advertencia a {warnUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1 py-2">
            <Label>Mensaje</Label>
            <textarea value={warnMessage} onChange={(e) => setWarnMessage(e.target.value)} rows={4}
              className="w-full border border-ss-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ss-primary resize-none"
              placeholder="Escribe el mensaje de advertencia..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnUser(null)}>Cancelar</Button>
            <Button onClick={handleWarn} disabled={sending || !warnMessage.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmBlockUser} onOpenChange={(o) => !o && setConfirmBlockUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmBlockUser?.is_blocked ? "¿Desbloquear usuario?" : "¿Bloquear usuario?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ss-text-muted py-2">
            {confirmBlockUser?.is_blocked ? (
              <>El usuario <span className="font-medium text-ss-text-dark">{confirmBlockUser?.name}</span> podrá volver a iniciar sesión.</>
            ) : (
              <>El usuario <span className="font-medium text-ss-text-dark">{confirmBlockUser?.name}</span> no podrá iniciar sesión hasta que sea desbloqueado.</>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBlockUser(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (confirmBlockUser) {
                  await handleBlock(confirmBlockUser);
                  setConfirmBlockUser(null);
                }
              }}
              className={confirmBlockUser?.is_blocked
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-ss-error hover:bg-red-700 text-white"
              }
            >
              {confirmBlockUser?.is_blocked ? "Desbloquear" : "Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar usuario?</DialogTitle></DialogHeader>
          <p className="text-sm text-ss-text-muted py-2">
            Esta acción eliminará permanentemente la cuenta de{" "}
            <span className="font-medium text-ss-text-dark">{deleteUser?.name}</span> y todos sus datos. No se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={deleting} variant="destructive">
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
