"use client";

import { useState, useEffect } from "react";
// CORREÇÃO: Garantir que a importação está correta
import { Evento, getVisibleDjEvents } from "@/lib/djService";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AgendaDjPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"planilha" | "calendario">("planilha");

  useEffect(() => {
    const fetchEventos = async () => {
      setLoading(true);
      try {
        if (!user?.uid) {
          console.log("[AgendaDJ] Usuário não autenticado, aguardando...");
          // Não lança erro, apenas espera o user.uid
          return; 
        }
        
        console.log(`[AgendaDJ] Buscando eventos para DJ: ${user.uid}`);
        // Passa o uid do usuário logado para buscar apenas seus eventos visíveis
        const eventosData = await getVisibleDjEvents(user.uid);
        console.log(`[AgendaDJ] Eventos recebidos: ${eventosData.length}`);
        setEventos(eventosData);
      } catch (error: any) {
        console.error("[AgendaDJ] Erro ao carregar eventos:", error);
        toast.error(`Erro ao carregar eventos: ${error.message || "Erro desconhecido"}`);
        // Limpa eventos em caso de erro para não mostrar dados antigos/falsos
        setEventos([]); 
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEventos();
    } else {
      // Se o usuário ainda não carregou, define loading como true
      setLoading(true);
    }
  }, [user]); // Dependência apenas no user

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    try {
      const [ano, mes, dia] = dataISO.split("-");
      // Validação simples
      if (!ano || !mes || !dia || ano.length !== 4 || mes.length !== 2 || dia.length !== 2) {
        throw new Error("Formato de data inválido");
      }
      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      console.warn(`[AgendaDJ] Erro ao formatar data: ${dataISO}`, error);
      return dataISO; // Retorna original em caso de erro
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    return "❓";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Agenda do DJ</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Agenda do DJ</h1>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode("planilha")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "planilha"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Visualização em Planilha
          </button>
          <button
            onClick={() => setViewMode("calendario")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "calendario"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Visualização em Calendário
          </button>
          <Link
            href="/dashboard/dj/create-event"
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 ml-2"
          >
            Adicionar Novo Evento
          </Link>
        </div>
      </div>

      {viewMode === "planilha" ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Próximos Eventos</h2>
          {eventos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Evento</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Local</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Horário</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Custos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status Pgto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eventos.map((evento) => (
                    <tr key={evento.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-800">{formatarData(evento.data)}</td>
                      <td className="px-4 py-3 text-gray-800">
                        {evento.nome_evento}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{evento.local}</td>
                      <td className="px-4 py-3 text-gray-800">{evento.horario || "-"}</td>
                      <td className="px-4 py-3 text-gray-800">R$ {(evento.valor_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">R$ {(evento.custos || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-800">
                        {getStatusIcon(evento.status_pgto)} {evento.status_pgto || "Não definido"}
                      </td>
                      <td className="px-4 py-3 flex items-center space-x-2">
                        <Link 
                          href={`/dashboard/dj/eventos/${evento.id}`}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors"
                          title="Ver detalhes"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link 
                          href={`/dashboard/dj/edit-event/${evento.id}`}
                          className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors"
                          title="Editar evento"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhum evento encontrado na sua agenda.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Calendário de Eventos</h2>
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Visualização de calendário será implementada aqui.</p>
              <p className="text-gray-500 italic">
                Para implementação completa, será necessário instalar e configurar um componente de calendário como o FullCalendar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
