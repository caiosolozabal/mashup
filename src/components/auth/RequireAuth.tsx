"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se não estiver carregando e não houver usuário, redireciona para login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Enquanto estiver carregando ou não houver usuário, mostra tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando autenticação...</p>
        </div>
      </div>
    );
  }
  
  // Se não estiver carregando e não houver usuário, mostra tela de redirecionamento
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Se houver usuário, renderiza o conteúdo
  return <>{children}</>;
}
