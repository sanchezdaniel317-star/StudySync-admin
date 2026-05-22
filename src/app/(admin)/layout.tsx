import Sidebar from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { PageTransition } from "@/components/page-transition";
import { Toaster } from "sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ss-background">
      <Toaster richColors position="top-right" />
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <AuthGuard>
          <PageTransition>{children}</PageTransition>
        </AuthGuard>
      </main>
    </div>
  );
}
