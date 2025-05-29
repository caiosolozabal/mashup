"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
// CORREÇÃO: Importar getAllVisibleEvents em vez de getAllVisibleEventsForAdmin
import { getAllVisibleEvents, deleteEvent, Evento, getAllDJs, DJ } from "@/lib/eventService"; 
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function EventsTablePage() {
  const { user, router } = useAuth(); // Obtém router do useAuth
  const [todosEventos, setTodosEventos] = useState<Evento[]>([]); // Armazena todos os eventos carregados
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [loadingDJs, setLoadingDJs] = useState(true);
  const [filteredEventos, setFilteredEventos] = useState<Evento[]>([]);
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState<Date>(new Date());
  const [filtroDJ, setFiltroDJ] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  
  // Ordenação
  const [ordenacao, setOrdenacao] = useState<{campo: string, direcao: 'asc' | 'desc'}>({ 
    campo: 'data', 
    direcao: 'desc' // Admin geralmente quer ver mais recentes primeiro
  });
  
  // Estado para armazenar lista de DJs para o filtro (vindo de getAllDJs)
  const [listaDJsFiltro, setListaDJsFiltro] = useState<DJ[]>([]);

  // Carregar eventos usando getAllVisibleEvents
  useEffect(() => {
    const fetchEventos = async () => {
      setLoadingEventos(true);
      try {
        console.log("[AdminTable] Buscando eventos...");
        // CORREÇÃO: Usar getAllVisibleEvents em vez de getAllVisibleEventsForAdmin
        const eventosData = await getAllVisibleEvents();
        console.log(`[AdminTable] Eventos recebidos: ${eventosData.length}`);
        setTodosEventos(eventosData);
      } catch (error) {
        console.error("[AdminTable] Erro ao carregar eventos:", error);
        toast.error("Erro ao carregar eventos. Verifique o console para detalhes.");
      } finally {
        setLoadingEventos(false);
      }
    };
    
    fetchEventos();
  }, []);

  // Carregar lista de DJs para o filtro
  useEffect(() => {
    const fetchDJs = async () => {
      setLoadingDJs(true);
      try {
        console.log("[AdminTable] Buscando DJs para filtro...");
        const djsData = await getAllDJs();
        console.log(`[AdminTable] DJs recebidos para filtro: ${djsData.length}`);
        setListaDJsFiltro(djsData);
      } catch (error) {
        console.error("[AdminTable] Erro ao carregar DJs para filtro:", error);
        toast.error("Erro ao carregar lista de DJs para filtro.");
      } finally {
        setLoadingDJs(false);
      }
    };

    fetchDJs();
  }, []);
  
  // Aplicar filtros e ordenação quando os eventos ou filtros mudarem
  useEffect(() => {
    console.log("[AdminTable] Aplicando filtros e ordenação...");
    const inicioMes = startOfMonth(filtroMes);
    const fimMes = endOfMonth(filtroMes);
    
    let eventosFiltrados = [...todosEventos];
    console.log(`[AdminTable] Eventos antes de filtrar: ${eventosFiltrados.length}`);
    
    // Filtrar por mês
    eventosFiltrados = eventosFiltrados.filter(evento => {
      if (!evento.data) return false;
      try {
        const dataEvento = parseISO(`${evento.data}T00:00:00`); 
        return dataEvento >= inicioMes && dataEvento <= fimMes;
      } catch (e) {
        console.warn(`[AdminTable] Data inválida encontrada: ${evento.data}`);
        return false;
      }
    });
    console.log(`[AdminTable] Eventos após filtro de mês (${format(filtroMes, "MM/yyyy")})): ${eventosFiltrados.length}`);
    
    // Filtrar por DJ
    if (filtroDJ !== "todos") {
      eventosFiltrados = eventosFiltrados.filter(evento => 
        evento.dj_id === filtroDJ
      );
      console.log(`[AdminTable] Eventos após filtro de DJ (${filtroDJ}): ${eventosFiltrados.length}`);
    }
    
    // Filtrar por status de pagamento
    if (filtroStatus !== "todos") {
      eventosFiltrados = eventosFiltrados.filter(evento => 
        evento.status_pgto === filtroStatus
      );
       console.log(`[AdminTable] Eventos após filtro de status (${filtroStatus}): ${eventosFiltrados.length}`);
    }
    
    // Aplicar ordenação
    eventosFiltrados.sort((a, b) => {
      let valorA: any;
      let valorB: any;
      
      switch (ordenacao.campo) {
        case 'data':
          valorA = a.data || '';
          valorB = b.data || '';
          break;
        case 'nome_evento':
          valorA = a.nome_evento || '';
          valorB = b.nome_evento || '';
          break;
        case 'valor_total':
          valorA = a.valor_total || 0;
          valorB = b.valor_total || 0;
          break;
        case 'dj_nome':
          valorA = a.dj_nome || ''; 
          valorB = b.dj_nome || '';
          break;
        case 'contratante_nome':
          valorA = a.contratante_nome || '';
          valorB = b.contratante_nome || '';
          break;
        default:
          valorA = a.data || '';
          valorB = b.data || '';
      }
      
      const comparison = valorA > valorB ? 1 : (valorA < valorB ? -1 : 0);
      return ordenacao.direcao === 'asc' ? comparison : comparison * -1;
    });
    
    setFilteredEventos(eventosFiltrados);
    console.log(`[AdminTable] Filtros e ordenação aplicados. Eventos na tabela: ${eventosFiltrados.length}`);

  }, [todosEventos, filtroMes, filtroDJ, filtroStatus, ordenacao]);
  
  // Função para formatar data
  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    try {
      const data = parseISO(`${dataISO}T00:00:00`);
      return format(data, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.warn(`Erro ao formatar data: ${dataISO}`, error);
      return dataISO;
    }
  };
  
  // Função para obter ícone de status
  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    if (status === "cancelado") return "🚫"; // Embora filtrados, pode ser útil
    return "❓";
  };
  
  // Função para alternar ordenação
  const toggleOrdenacao = (campo: string) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Função para obter ícone de ordenação
  const getOrdenacaoIcon = (campo: string) => {
    if (ordenacao.campo !== campo) return null;
    return ordenacao.direcao === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };
  
  // Função para mudar mês
  const mudarMes = (direcao: number) => {
    setFiltroMes(prev => addMonths(prev, direcao));
  };

  // Função para excluir evento (usando deleteEvent do service)
  const handleExcluirEvento = async (eventoId: string) => {
    if (!user?.uid) {
      toast.error("Usuário não autenticado.");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir este evento? Esta ação marcará o evento como excluído, mas ele poderá ser recuperado se necessário.")) {
      try {
        await deleteEvent(eventoId, user.uid);
        toast.success("Evento excluído com sucesso!");
        setTodosEventos(prev => prev.filter(evento => evento.id !== eventoId));
      } catch (error: any) {
        console.error("Erro ao excluir evento:", error);
        toast.error(error.message || "Erro ao excluir evento.");
      }
    }
  };

  // Função para navegar para a página de edição
  const navigateToEdit = (id: string) => {
    router.push(`/dashboard/admin/manage-events/edit/${id}`);
  };
  
  // Função para navegar para a página de detalhes
  const navigateToDetails = (id: string) => {
    router.push(`/dashboard/admin/manage-events/details/${id}`);
  };

  const isLoading = loadingEventos || loadingDJs;

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Eventos (Tabela)</h1>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/manage-events/create"
              className="btn-primary"
            >
              Novo Evento
            </Link>
            <Link
              href="/dashboard/admin/manage-events/calendar"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Ver Calendário
            </Link>
            <Link
              href="/dashboard/admin"
              className="btn-secondary"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="content-card mb-6">
          <h2 className="section-title">Filtros</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Mês */}
            <div>
              <label className="form-label">Mês</label>
              <div className="flex items-center">
                <button 
                  onClick={() => mudarMes(-1)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-l-md"
                  disabled={isLoading}
                >
                  &lt;
                </button>
                <div className="flex-1 bg-gray-100 text-center py-2 font-medium text-gray-800">
                  {format(filtroMes, "MMMM yyyy", { locale: ptBR })}
                </div>
                <button 
                  onClick={() => mudarMes(1)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-r-md"
                  disabled={isLoading}
                >
                  &gt;
                </button>
              </div>
            </div>
            
            {/* Filtro de DJ */}
            <div>
              <label className="form-label">DJ</label>
              <select
                value={filtroDJ}
                onChange={(e) => setFiltroDJ(e.target.value)}
                className="form-select"
                disabled={isLoading || listaDJsFiltro.length === 0}
              >
                <option value="todos">Todos os DJs</option>
                {listaDJsFiltro.map(dj => (
                  <option key={dj.id} value={dj.id}>
                    {dj.nome} 
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro de Status */}
            <div>
              <label className="form-label">Status de Pagamento</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="form-select"
                disabled={isLoading}
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">🕒 Pendente</option>
                <option value="parcial">⚠️ Parcial</option>
                <option value="quitado">✅ Quitado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Eventos */}
        <div className="content-card overflow-hidden">
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th 
                      className="cursor-pointer"
                      onClick={() => toggleOrdenacao('data')}
                    >
                      <div className="flex items-center">
                        Data {getOrdenacaoIcon('data')}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => toggleOrdenacao('nome_evento')}
                    >
                      <div className="flex items-center">
                        Evento {getOrdenacaoIcon('nome_evento')}
                      </div>
                    </th>
                    <th>
                      Local
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => toggleOrdenacao('dj_nome')}
                    >
                      <div className="flex items-center">
                        DJ {getOrdenacaoIcon('dj_nome')}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => toggleOrdenacao('contratante_nome')}
                    >
                      <div className="flex items-center">
                        Contratante {getOrdenacaoIcon('contratante_nome')}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => toggleOrdenacao('valor_total')}
                    >
                      <div className="flex items-center">
                        Valor {getOrdenacaoIcon('valor_total')}
                      </div>
                    </th>
                    <th>
                      Status Pgto.
                    </th>
                    <th>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEventos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-500">
                        {todosEventos.length === 0 ? "Nenhum evento cadastrado no sistema." : "Nenhum evento encontrado para os filtros selecionados."}
                      </td>
                    </tr>
                  ) : (
                    filteredEventos.map((evento) => (
                      <tr key={evento.id} className="hover:bg-gray-50">
                        <td>{formatarData(evento.data)}</td>
                        <td>{evento.nome_evento || "-"}</td>
                        <td>{evento.local || "-"}</td>
                        <td>{evento.dj_nome || "-"}</td> 
                        <td>{evento.contratante_nome || "-"}</td>
                        <td>{evento.valor_total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "-"}</td>
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
                        <td className="flex items-center space-x-1">
                          <button
                            onClick={() => navigateToDetails(evento.id)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Ver Detalhes"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => navigateToEdit(evento.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleExcluirEvento(evento.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
}
