"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, isDJ, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Define o link principal baseado no tipo de usuário
  const homeLink = isAdmin ? "/dashboard/admin" : (isDJ ? "/dashboard/dj" : "/");

  return (
    <header className="app-header bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          {/* Logo ou Nome da Agência - Ajustado */}
          <Link href={homeLink} className="flex items-center">
            <div className="sound-wave mr-3">
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </div>
            <span className="text-xl font-bold">
              Mashup Music
            </span>
          </Link>
        </div>

        {/* Menu Desktop - Restaurado e Ajustado */}
        <nav className="hidden md:flex items-center space-x-6">
          {/* Links para DJ (restaurados) */}
          {!loading && isDJ && (
            <>
              <Link href="/dashboard/dj" className="hover:text-blue-400">
                Dashboard DJ
              </Link>
              <Link href="/dashboard/dj/agenda" className="hover:text-blue-400">
                Agenda
              </Link>
              <Link href="/dashboard/dj/financeiro" className="hover:text-blue-400">
                Financeiro
              </Link>
            </>
          )}

          {/* Links para Admin (atualizados, removido Aprovar Eventos, adicionado Financeiro) */}
          {!loading && isAdmin && (
            <>
              <Link href="/dashboard/admin" className="hover:text-blue-400">
                Dashboard Admin
              </Link>
              <Link href="/dashboard/admin/manage-events" className="hover:text-blue-400">
                Gerenciar Eventos
              </Link>
              {/* Substituído link de Aprovar Eventos por Financeiro */}
              <Link href="/dashboard/admin/financeiro" className="hover:text-blue-400">
                Financeiro
              </Link>
              <Link href="/dashboard/admin/settings" className="hover:text-blue-400">
                Configurações
              </Link>
            </>
          )}

          {/* Botão de Sair */}
          {user && (
            <button
              onClick={handleLogout}
              className="ml-4 text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
            >
              Sair
            </button>
          )}
          
          {/* Link de Login */}
          {!user && !loading && (
             <Link href="/login" className="hover:text-blue-400">
                Login
              </Link>
          )}
        </nav>

        {/* Botão Mobile */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor"
            className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Menu Mobile (Dropdown) - Atualizado */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-gray-700 px-4 py-3 absolute top-full left-0 right-0 z-20 shadow-lg">
          <ul className="flex flex-col space-y-2">
            {/* Links Mobile para DJ (restaurados) */}
            {!loading && isDJ && (
              <>
                <li><Link href="/dashboard/dj" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Dashboard DJ</Link></li>
                <li><Link href="/dashboard/dj/agenda" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Agenda</Link></li>
                <li><Link href="/dashboard/dj/financeiro" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Financeiro</Link></li>
              </>
            )}

            {/* Links Mobile para Admin (atualizados, removido Aprovar Eventos, adicionado Financeiro) */}
            {!loading && isAdmin && (
              <>
                <li><Link href="/dashboard/admin" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Dashboard Admin</Link></li>
                <li><Link href="/dashboard/admin/manage-events" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Gerenciar Eventos</Link></li>
                <li><Link href="/dashboard/admin/financeiro" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Financeiro</Link></li>
                <li><Link href="/dashboard/admin/settings" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Configurações</Link></li>
              </>
            )}

            {/* Botão de Sair Mobile */}
            {user && (
              <li>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="text-left w-full py-1 text-red-400 hover:text-red-500"
                >
                  Sair
                </button>
              </li>
            )}
            
            {/* Link de Login Mobile */}
            {!user && !loading && (
                 <li><Link href="/login" className="block py-1 hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>Login</Link></li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
