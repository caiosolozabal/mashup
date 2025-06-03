"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Interface para Log/Histórico
interface LogEntry {
  id: string;
  user_id: string;
  user_email?: string;
  user_nome?: string;
  user_role?: string;
  acao: string;
  timestamp: Timestamp;
  detalhes?: any;
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  
  // Filtros
  const [filtroAcao, setFiltroAcao] = useState<string>("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("7dias");
  const [filtroPesquisa, setFiltroPesquisa] = useState<string>("");
  
  // Lista de tipos de ações para filtro
  const tiposAcoes = [
    { valor: "todas", label: "Todas as Ações" },
    { valor: "evento_criado", label: "Evento Criado" },
    { valor: "evento_atualizado", label: "Evento Atualizado" },
    { valor: "evento_excluido", label: "Evento Excluído" },
    { valor: "evento_aprovado", label: "Evento Aprovado" },
    { valor: "evento_rejeitado", label: "Evento Rejeitado" },
    { valor: "pagamento_registrado", label: "Pagamento Registrado" },
    { valor: "perfil_atualizado", label: "Perfil Atualizado" },
    { valor: "dj_atualizado", label: "DJ Atualizado" },
    { valor: "login", label: "Login" },
    { valor: "logout", label: "Logout" }
  ];

  // Carregar logs iniciais
  useEffect(() => {
    loadLogs();
  }, [filtroAcao, filtroPeriodo]);

  // Função para carregar logs
  const loadLogs = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLastVisible(null);
    }

    try {
      // Construir query base
      let logsQuery = collection(db, "historico");
      let constraints = [];
      
      // Aplicar filtro de período
      if (filtroPeriodo !== "todos") {
        let startDate;
        const now = new Date();
        
        if (filtroPeriodo === "24h") {
          startDate = subDays(now, 1);
        } else if (filtroPeriodo === "7dias") {
          startDate = subDays(now, 7);
        } else if (filtroPeriodo === "30dias") {
          startDate = subDays(now, 30);
        }
        
        if (startDate) {
          constraints.push(where("timestamp", ">=", Timestamp.fromDate(startDate)));
        }
      }
      
      // Aplicar filtro de ação
      if (filtroAcao !== "todas") {
        constraints.push(where("acao", "==", filtroAcao));
      }
      
      // Ordenar por timestamp decrescente
      constraints.push(orderBy("timestamp", "desc"));
      
      // Aplicar paginação
      if (isLoadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }
      
      // Limitar quantidade de resultados
      constraints.push(limit(20));
      
      // Executar query
      const q = query(logsQuery, ...constraints);
      const querySnapshot = await getDocs(q);
      
      // Processar resultados
      const logsData: LogEntry[] = [];
      querySnapshot.forEach((doc) => {
        const logData = doc.data();
        logsData.push({
          id: doc.id,
          user_id: logData.user_id || "",
          user_email: logData.user_email || "",
          user_nome: logData.user_nome || "",
          user_role: logData.user_role || "",
          acao: logData.acao || "",
          timestamp: logData.timestamp,
          detalhes: logData.detalhes || {}
        });
      });
      
      // Atualizar estado
      if (isLoadMore) {
        setLogs(prev => [...prev, ...logsData]);
      } else {
        setLogs(logsData);
      }
      
      // Atualizar último item visível para paginação
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      // Verificar se há mais resultados
      setHasMore(querySnapshot.docs.length === 20);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de ações");
      
      // Dados simulados em caso de erro
      if (!isLoadMore) {
        const mockLogs: LogEntry[] = [
          {
            id: "log1",
            user_id: "user1",
            user_email: "admin@exemplo.com",
            user_nome: "Admin",
            user_role: "admin",
            acao: "evento_criado",
            timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60)),
            detalhes: {
              evento_id: "evt1",
              nome_evento: "Casamento Silva"
            }
          },
          {
            id: "log2",
            user_id: "user2",
            user_email: "dj@exemplo.com",
            user_nome: "DJ Carlos",
            user_role: "dj",
            acao: "perfil_atualizado",
            timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 3)),
            detalhes: {
              campos_atualizados: ["telefone", "banco", "conta"]
            }
          },
          {
            id: "log3",
            user_id: "user1",
            user_email: "admin@exemplo.com",
            user_nome: "Admin",
            user_role: "admin",
            acao: "pagamento_registrado",
            timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)),
            detalhes: {
              evento_id: "evt2",
              nome_evento: "Formatura Medicina",
              valor: 2500
            }
          }
        ];
        
        setLogs(mockLogs);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Função para carregar mais logs
  const loadMoreLogs = () => {
    if (!loadingMore && hasMore) {
      loadLogs(true);
    }
  };

  // Função para formatar timestamp
  const formatTimestamp = (timestamp: Timestamp) => {
    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função para obter descrição amigável da ação
  const getAcaoDescricao = (acao: string) => {
    const acaoEncontrada = tiposAcoes.find(tipo => tipo.valor === acao);
    return acaoEncontrada ? acaoEncontrada.label : acao;
  };

  // Função para obter ícone da ação
  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case "evento_criado":
        return "📝";
      case "evento_atualizado":
        return "✏️";
      case "evento_excluido":
        return "🗑️";
      case "evento_aprovado":
        return "✅";
      case "evento_rejeitado":
        return "❌";
      case "pagamento_registrado":
        return "💰";
      case "perfil_atualizado":
        return "👤";
      case "dj_atualizado":
        return "🎧";
      case "login":
        return "🔑";
      case "logout":
        return "🚪";
      default:
        return "📋";
    }
  };

  // Função para obter cor da ação
  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case "evento_criado":
        return "bg-green-100 text-green-800";
      case "evento_atualizado":
        return "bg-blue-100 text-blue-800";
      case "evento_excluido":
        return "bg-red-100 text-red-800";
      case "evento_aprovado":
        return "bg-green-100 text-green-800";
      case "evento_rejeitado":
        return "bg-red-100 text-red-800";
      case "pagamento_registrado":
        return "bg-purple-100 text-purple-800";
      case "perfil_atualizado":
        return "bg-indigo-100 text-indigo-800";
      case "dj_atualizado":
        return "bg-blue-100 text-blue-800";
      case "login":
        return "bg-gray-100 text-gray-800";
      case "logout":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Função para filtrar logs por pesquisa
  const filteredLogs = logs.filter(log => {
    if (!filtroPesquisa) return true;
    
    const searchLower = filtroPesquisa.toLowerCase();
    
    // Pesquisar em vários campos
    return (
      (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
      (log.user_nome && log.user_nome.toLowerCase().includes(searchLower)) ||
      (log.acao && log.acao.toLowerCase().includes(searchLower)) ||
      (log.detalhes && JSON.stringify(log.detalhes).toLowerCase().includes(searchLower))
    );
  });

  // Função para exportar logs
  const exportarLogs = () => {
    // Implementação futura: exportar para CSV ou Excel
    toast.info("Funcionalidade de exportação será implementada em breve");
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Histórico de Ações</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Ações</h1>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportarLogs}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Logs
            </button>
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
            {/* Filtro de Ação */}
            <div>
              <label className="form-label">Tipo de Ação</label>
              <select
                value={filtroAcao}
                onChange={(e) => setFiltroAcao(e.target.value)}
                className="form-select"
              >
                {tiposAcoes.map(tipo => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro de Período */}
            <div>
              <label className="form-label">Período</label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="form-select"
              >
                <option value="24h">Últimas 24 horas</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="todos">Todo o histórico</option>
              </select>
            </div>
            
            {/* Filtro de Pesquisa */}
            <div>
              <label className="form-label">Pesquisar</label>
              <input
                type="text"
                value={filtroPesquisa}
                onChange={(e) => setFiltroPesquisa(e.target.value)}
                placeholder="Pesquisar por usuário, ação, etc."
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Lista de Logs */}
        <div className="content-card">
          <h2 className="section-title">Registros de Atividade</h2>
          
          {filteredLogs.length > 0 ? (
            <div className="space-y-4 mt-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between mb-2">
                    <div className="flex items-center gap-2 mb-2 md:mb-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAcaoColor(log.acao)}`}>
                        {getAcaoIcon(log.acao)} {getAcaoDescricao(log.acao)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {log.user_role === "admin" ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">Admin</span>
                      ) : log.user_role === "dj" ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">DJ</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">Usuário</span>
                      )}
                      {" "}
                      {log.user_nome || log.user_email || "Usuário desconhecido"}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 mt-2">
                    {log.acao === "evento_criado" && (
                      <p>
                        Evento criado: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                      </p>
                    )}
                    
                    {log.acao === "evento_atualizado" && (
                      <p>
                        Evento atualizado: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                        {log.detalhes?.campos_atualizados && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Campos atualizados: {log.detalhes.campos_atualizados.join(", ")}
                          </span>
                        )}
                      </p>
                    )}
                    
                    {log.acao === "evento_excluido" && (
                      <p>
                        Evento excluído: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                      </p>
                    )}
                    
                    {log.acao === "evento_aprovado" && (
                      <p>
                        Evento aprovado: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                      </p>
                    )}
                    
                    {log.acao === "evento_rejeitado" && (
                      <p>
                        Evento rejeitado: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                        {log.detalhes?.motivo && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Motivo: {log.detalhes.motivo}
                          </span>
                        )}
                      </p>
                    )}
                    
                    {log.acao === "pagamento_registrado" && (
                      <p>
                        Pagamento registrado para evento: <strong>{log.detalhes?.nome_evento || "Sem nome"}</strong>
                        {log.detalhes?.valor && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Valor: R$ {typeof log.detalhes.valor === 'number' ? log.detalhes.valor.toFixed(2) : log.detalhes.valor}
                          </span>
                        )}
                      </p>
                    )}
                    
                    {log.acao === "perfil_atualizado" && (
                      <p>
                        Perfil atualizado
                        {log.detalhes?.campos_atualizados && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Campos atualizados: {log.detalhes.campos_atualizados.join(", ")}
                          </span>
                        )}
                      </p>
                    )}
                    
                    {log.acao === "dj_atualizado" && (
                      <p>
                        DJ atualizado: <strong>{log.detalhes?.dj_nome || "Sem nome"}</strong>
                        {log.detalhes?.campos_atualizados && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Campos atualizados: {log.detalhes.campos_atualizados.join(", ")}
                          </span>
                        )}
                      </p>
                    )}
                    
                    {log.acao === "login" && (
                      <p>Login realizado</p>
                    )}
                    
                    {log.acao === "logout" && (
                      <p>Logout realizado</p>
                    )}
                    
                    {!["evento_criado", "evento_atualizado", "evento_excluido", "evento_aprovado", "evento_rejeitado", "pagamento_registrado", "perfil_atualizado", "dj_atualizado", "login", "logout"].includes(log.acao) && (
                      <p>
                        {log.acao}
                        {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Detalhes: {JSON.stringify(log.detalhes)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Botão Carregar Mais */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMoreLogs}
                    disabled={loadingMore}
                    className={`btn-secondary ${loadingMore ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando...
                      </span>
                    ) : (
                      'Carregar Mais'
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic mt-4">Nenhum registro encontrado para os filtros selecionados.</p>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
}
