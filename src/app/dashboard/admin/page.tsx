"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function AdminPage() {
  const { isAdmin, perfil, loading } = useAuth();

  // Redirecionar para o dashboard financeiro
  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.href = "/login";
    }
  }, [isAdmin, loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Gerenciamento de Usuários */}
        <Link href="/dashboard/admin/manage-users">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-4">Gerenciamento de Usuários</h2>
            <p className="text-gray-600 mb-4">
              Crie, edite e gerencie todos os usuários do sistema (DJs e Admins).
            </p>
            <div className="flex justify-end">
              <span className="text-blue-500 font-medium">Acessar →</span>
            </div>
          </div>
        </Link>
        
        {/* Card de Gerenciamento de Eventos */}
        <Link href="/dashboard/admin/manage-events">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-4">Gerenciamento de Eventos</h2>
            <p className="text-gray-600 mb-4">
              Visualize, edite e gerencie todos os eventos cadastrados no sistema.
            </p>
            <div className="flex justify-end">
              <span className="text-blue-500 font-medium">Acessar →</span>
            </div>
          </div>
        </Link>
        
        {/* Card de Financeiro */}
        <Link href="/dashboard/admin/financeiro">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-4">Financeiro</h2>
            <p className="text-gray-600 mb-4">
              Visualize resumos financeiros, relatórios e análises de pagamentos.
            </p>
            <div className="flex justify-end">
              <span className="text-blue-500 font-medium">Acessar →</span>
            </div>
          </div>
        </Link>
        
        {/* Card de Aprovação de Eventos */}
        <Link href="/dashboard/admin/approve-events">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-4">Aprovação de Eventos</h2>
            <p className="text-gray-600 mb-4">
              Aprove ou rejeite eventos pendentes cadastrados pelos DJs.
            </p>
            <div className="flex justify-end">
              <span className="text-blue-500 font-medium">Acessar →</span>
            </div>
          </div>
        </Link>
        
        {/* Card de Configurações */}
        <Link href="/dashboard/admin/settings">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-4">Configurações</h2>
            <p className="text-gray-600 mb-4">
              Configure parâmetros do sistema, percentuais padrão e outras opções.
            </p>
            <div className="flex justify-end">
              <span className="text-blue-500 font-medium">Acessar →</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
