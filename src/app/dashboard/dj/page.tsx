"use client";

import { useState, useEffect } from "react";
import { getWeeklyEventsForDJ, Evento, calcularResumoFinanceiroDJ, ResumoFinanceiroDJ } from "@/lib/djService";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function DashboardDjPage() {
  const { user } = useAuth();
  const [eventosSemanaAtual, setEventosSemanaAtual] = useState<Evento[]>([]);
  const [eventosProximaSemana, setEventosProximaSemana] = useState<Evento[]>([]);
  // Atualiza o estado para usar a nova interface ResumoFinanceiroDJ
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiroDJ>({
    totalEventos: 0,
    somaValorTotalBruto: 0,
    somaCustos: 0,
    somaValorLiquidoDJ: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Inicia o loading
      try {
        if (!user?.uid) {
          throw new Error("Usuário não autenticado");
        }

        // Carrega eventos das semanas
        const { semanaAtual, proximaSemana } = await getWeeklyEventsForDJ(user.uid);
        setEventosSemanaAtual(semanaAtual);
        setEventosProximaSemana(proximaSemana);

        // Carrega o resumo financeiro usando a função do djService
        const financas = await calcularResumoFinanceiroDJ(user.uid);
        setResumoFinanceiro(financas);

      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        toast.error("Erro ao carregar dados do dashboard");
        // Define valores padrão em caso de erro para evitar quebra
        setResumoFinanceiro({
          totalEventos: 0,
          somaValorTotalBruto: 0,
          somaCustos: 0,
          somaValorLiquidoDJ: 0,
        });
      } finally {
        setLoading(false); // Finaliza o loading
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Dashboard do DJ</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8 app-content bg-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do DJ</h1>
          
          <Link
            href="/dashboard/dj/create-event"
            className="btn-primary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Adicionar Novo Evento
          </Link>
        </div>

        {/* Atualiza o card de Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="content-card bg-white">
            <h2 className="section-title text-blue-700">Resumo Financeiro (Mês Atual)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total de Eventos:</p>
                <p className="text-xl font-bold text-gray-900">{resumoFinanceiro.totalEventos}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Bruto Total:</p>
                <p className="text-xl font-bold text-gray-900">{formatarValor(resumoFinanceiro.somaValorTotalBruto)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Custos Totais:</p>
                <p className="text-xl font-bold text-red-600">{formatarValor(resumoFinanceiro.somaCustos)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Líquido DJ:</p>
                <p className="text-xl font-bold text-green-600">{formatarValor(resumoFinanceiro.somaValorLiquidoDJ)}</p>
              </div>
            </div>
            <Link
              href="/dashboard/dj/financeiro"
              className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-center transition-colors w-full"
            >
              Ver Detalhes Financeiros
            </Link>
          </div>

          <div className="content-card bg-white">
            <h2 className="section-title text-blue-700">Navegação Rápida</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/dj/agenda"
                className="bg-green-50 hover:bg-green-100 p-4 rounded-lg border border-green-200 transition-colors"
              >
                <h3 className="text-lg font-medium text-green-700">Agenda</h3>
                <p className="text-sm text-gray-600">Visualize e gerencie seus eventos</p>
              </Link>
              <Link
                href="/dashboard/dj/financeiro"
                className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border border-purple-200 transition-colors"
              >
                <h3 className="text-lg font-medium text-purple-700">Financeiro</h3>
                <p className="text-sm text-gray-600">Acompanhe seus ganhos e pagamentos</p>
              </Link>
              <Link
                href="/dashboard/dj/create-event"
                className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 transition-colors col-span-1 sm:col-span-2"
              >
                <h3 className="text-lg font-medium text-blue-700">Criar Evento</h3>
                <p className="text-sm text-gray-600">Adicione um novo evento ao seu calendário</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Eventos da Semana Atual */}
        <div className="content-card mb-8 bg-white">
          <h2 className="section-title text-blue-700">Eventos da Semana Atual</h2>
          {eventosSemanaAtual.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Local</th>
                    <th>Horário</th>
                    <th>Status Pgto.</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosSemanaAtual.map((evento) => {
                    let statusIcon = "❓";
                    if (evento.status_pgto === "quitado") statusIcon = "✅";
                    else if (evento.status_pgto === "parcial") statusIcon = "⚠️";
                    else if (evento.status_pgto === "pendente") statusIcon = "🕒";

                    return (
                      <tr key={evento.id} className="hover:bg-gray-50">
                        <td>{formatarData(evento.data)}</td>
                        <td>{evento.nome_evento}</td>
                        <td>{evento.local}</td>
                        <td>{evento.horario || "-"}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            evento.status_pgto === "quitado" ? "bg-green-100 text-green-800" :
                            evento.status_pgto === "parcial" ? "bg-yellow-100 text-yellow-800" :
                            evento.status_pgto === "pendente" ? "bg-gray-100 text-gray-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {statusIcon} {evento.status_pgto ? evento.status_pgto.charAt(0).toUpperCase() + evento.status_pgto.slice(1) : "Não definido"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhum evento agendado para esta semana.</p>
          )}
        </div>

        {/* Eventos da Próxima Semana */}
        <div className="content-card bg-white">
          <h2 className="section-title text-blue-700">Próximos Eventos (Semana Seguinte)</h2>
          {eventosProximaSemana.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Local</th>
                    <th>Horário</th>
                    <th>Status Pgto.</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosProximaSemana.map((evento) => {
                    let statusIcon = "❓";
                    if (evento.status_pgto === "quitado") statusIcon = "✅";
                    else if (evento.status_pgto === "parcial") statusIcon = "⚠️";
                    else if (evento.status_pgto === "pendente") statusIcon = "🕒";

                    return (
                      <tr key={evento.id} className="hover:bg-gray-50">
                        <td>{formatarData(evento.data)}</td>
                        <td>{evento.nome_evento}</td>
                        <td>{evento.local}</td>
                        <td>{evento.horario || "-"}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            evento.status_pgto === "quitado" ? "bg-green-100 text-green-800" :
                            evento.status_pgto === "parcial" ? "bg-yellow-100 text-yellow-800" :
                            evento.status_pgto === "pendente" ? "bg-gray-100 text-gray-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {statusIcon} {evento.status_pgto ? evento.status_pgto.charAt(0).toUpperCase() + evento.status_pgto.slice(1) : "Não definido"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhum evento agendado para a próxima semana.</p>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
