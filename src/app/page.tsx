"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se não estiver carregando e não houver usuário, redireciona para login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Enquanto estiver carregando, mostra tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bem-vindo ao Mashup!</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Navegação Rápida</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/dj" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
            <h3 className="text-xl font-medium text-blue-700 mb-2">Dashboard DJ</h3>
            <p className="text-gray-600">Acesse seu painel com eventos da semana e resumo financeiro.</p>
          </Link>
          
          <Link href="/dashboard/dj/agenda" className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
            <h3 className="text-xl font-medium text-green-700 mb-2">Agenda</h3>
            <p className="text-gray-600">Visualize seus eventos em formato de planilha ou calendário.</p>
          </Link>
          
          <Link href="/dashboard/admin" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors">
            <h3 className="text-xl font-medium text-purple-700 mb-2">Área Admin</h3>
            <p className="text-gray-600">Gerencie eventos, financeiro e configurações do Mashup.</p>
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Sobre o Sistema</h2>
        <p className="text-gray-700 mb-4">
          Este sistema foi desenvolvido para facilitar a gestão do Mashup, permitindo o controle de eventos, 
          agenda e financeiro de forma simples e eficiente.
        </p>
        <p className="text-gray-700">
          Navegue pelo menu superior para acessar as diferentes áreas do sistema. Cada seção foi projetada para ser 
          intuitiva e fornecer as informações necessárias para o gerenciamento eficaz do Mashup.
        </p>
      </div>
    </div>
  );
}
