"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await api.login(email, password);
      auth.saveToken(access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ss-background px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-ss-input-border p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-ss-primary rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ss-text-dark">StudySync Admin</h1>
          <p className="text-sm text-ss-text-muted mt-1">Panel de administración</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-ss-text-dark font-medium">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="admin@studysync.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="border-ss-input-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-ss-text-dark font-medium">Contraseña</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="border-ss-input-border" />
          </div>
          {error && <p className="text-sm text-ss-error bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={loading}
            className="w-full bg-ss-primary hover:bg-ss-primary-dark text-white font-semibold h-12 rounded-xl">
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}
