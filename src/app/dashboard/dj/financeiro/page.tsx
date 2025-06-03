"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
// Importa as funções necessárias do djService, substituindo getDjEventsByMonth por getVisibleDjEvents
import { 
  Evento, 
  getVisibleDjEvents, 
  calcularResumoFinanceiroDJ, 
  calcularValorLiquidoDJEvento, 
  ResumoFinanceiroDJ 
} from "@/lib/djService";

export default function FinanceiroDjPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  // Atualiza o estado do resumo para usar a interface ResumoFinanceiroDJ
  const [resumoMes, setResumoMes] = useState<ResumoFinanceiroDJ>({
    totalEventos: 0,
    somaValorTotalBruto: 0,
    somaCustos: 0,
    somaValorLiquidoDJ: 0
  });
  
  // Estado para filtros
  const [mesSelecionado, setMesSelecionado] = useState<number>(() => {
    const dataAtual = new Date();
    return dataAtual.getMonth() + 1; // Mês atual (1-12)
  });
  
  const [anoSelecionado, setAnoSelecionado] = useState<number>(() => {
    const dataAtual = new Date();
    return dataAtual.getFullYear(); // Ano atual
  });

  useEffect(() => {
    const fetchDadosFinanceiros = async () => {
      setLoading(true);
      try {
        if (!user?.uid) {
          throw new Error("Usuário não autenticado");
        }
        
        // Buscar todos os eventos visíveis do DJ usando getVisibleDjEvents
        const todosEventos = await getVisibleDjEvents(user.uid);
        
        // Filtrar eventos por mês e ano no lado do cliente
        const eventosDoMes = todosEventos.filter(evento => {
          if (!evento.data) return false;
          
          const [ano, mes] = evento.data.split('-').map(Number);
          return ano === anoSelecionado && mes === mesSelecionado;
        });
        
        setEventos(eventosDoMes);
        
        // Calcular resumo financeiro manualmente
        const resumo: ResumoFinanceiroDJ = {
          totalEventos: eventosDoMes.length,
          somaValorTotalBruto: 0,
          somaCustos: 0,
          somaValorLiquidoDJ: 0
        };
        
        // Calcular os valores do resumo
        eventosDoMes.forEach(evento => {
          resumo.somaValorTotalBruto += evento.valor_total || 0;
          // Usar custos ou custos_dj, o que estiver disponível
          resumo.somaCustos += evento.custos || evento.custos_dj || 0;
          resumo.somaValorLiquidoDJ += calcularValorLiquidoDJEvento(evento);
        });
        
        setResumoMes(resumo);

      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
        toast.error("Erro ao carregar dados financeiros");
        // Zera os valores em caso de erro
        setEventos([]);
        setResumoMes({
          totalEventos: 0,
          somaValorTotalBruto: 0,
          somaCustos: 0,
          somaValorLiquidoDJ: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDadosFinanceiros();
    }
  }, [user, mesSelecionado, anoSelecionado]);

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  // Função para formatar valor monetário
  const formatarValor = (valor?: number) => {
    if (valor === undefined || valor === null) return "R$ 0,00";
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getNomeMes = (mes: number) => {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return meses[mes - 1];
  };

  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMesSelecionado(parseInt(e.target.value));
  };

  const handleAnoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnoSelecionado(parseInt(e.target.value));
  };

  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    return "❓";
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6">Financeiro DJ</h1>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Financeiro DJ</h1>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Link
              href="/dashboard/dj/agenda"
              className="btn-secondary"
            >
              Ver Agenda
            </Link>
          </div>
        </div>

        {/* Resumo do Mês */}
        <div className="content-card bg-white mb-6">
          <h2 className="section-title text-blue-700">Resumo Financeiro - {getNomeMes(mesSelecionado)} de {anoSelecionado}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total de Eventos no Mês</p>
              <p className="text-2xl font-bold text-gray-900">{resumoMes.totalEventos}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Valor Bruto</p>
              <p className="text-2xl font-bold text-blue-800">{formatarValor(resumoMes.somaValorTotalBruto)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 mb-1">Custos</p>
              <p className="text-2xl font-bold text-red-800">{formatarValor(resumoMes.somaCustos)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-1">Valor Líquido DJ</p>
              <p className="text-2xl font-bold text-green-800">{formatarValor(resumoMes.somaValorLiquidoDJ)}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="content-card bg-white mb-6">
          <h2 className="section-title">Filtrar Eventos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <select
                id="mes"
                value={mesSelecionado}
                onChange={handleMesChange}
                className="form-input w-full"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                  <option key={mes} value={mes}>{getNomeMes(mes)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <select
                id="ano"
                value={anoSelecionado}
                onChange={handleAnoChange}
                className="form-input w-full"
              >
                {/* Gera os últimos 5 anos e os próximos 2 */}
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i).map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="content-card bg-white">
          <h2 className="section-title text-blue-700">Eventos do Mês Selecionado</h2>
          
          {eventos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Local</th>
                    <th>Valor Total</th>
                    <th>Custos DJ</th>
                    <th>Valor Líquido DJ</th>
                    <th>Status Pgto</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento) => {
                    // Usa a função centralizada para calcular o valor líquido do DJ
                    const valorLiquidoDj = calcularValorLiquidoDJEvento(evento);
                    // Usar custos ou custos_dj, o que estiver disponível
                    const custos = evento.custos || evento.custos_dj || 0;
                    
                    return (
                      <tr key={evento.id} className="hover:bg-gray-50">
                        <td>{formatarData(evento.data)}</td>
                        <td>{evento.nome_evento}</td>
                        <td>{evento.local}</td>
                        <td>{formatarValor(evento.valor_total)}</td>
                        <td>{formatarValor(custos)}</td>
                        <td className="font-medium">
                          {formatarValor(valorLiquidoDj)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            evento.status_pgto === "quitado" ? "bg-green-100 text-green-800" :
                            evento.status_pgto === "parcial" ? "bg-yellow-100 text-yellow-800" :
                            evento.status_pgto === "pendente" ? "bg-gray-100 text-gray-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {getStatusIcon(evento.status_pgto)} {evento.status_pgto ? evento.status_pgto.charAt(0).toUpperCase() + evento.status_pgto.slice(1) : "Não definido"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhum evento encontrado para o período selecionado.</p>
          )}
        </div>

        <div className="mt-8">
          <Link 
            href="/dashboard/dj" 
            className="btn-secondary"
          >
            Voltar para Dashboard
          </Link>
        </div>
      </div>
    </RequireAuth>
  );
}
