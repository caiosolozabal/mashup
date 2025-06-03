"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";

export default function ManageEventsPage() {
  const router = useRouter();

  // Redirecionar automaticamente para a visualização em tabela
  useEffect(() => {
    router.push("/dashboard/admin/manage-events/table");
  }, [router]);

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Eventos</h1>
        
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Redirecionando para visualização em tabela...</p>
        </div>
        
        <div className="flex justify-center space-x-4 mt-6">
          <Link
            href="/dashboard/admin/manage-events/table"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Ver em Tabela
          </Link>
          <Link
            href="/dashboard/admin/manage-events/calendar"
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Ver em Calendário
          </Link>
          <Link
            href="/dashboard/admin/manage-events/create"
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Criar Evento
          </Link>
        </div>
      </div>
    </RequireAdmin>
  );
}
