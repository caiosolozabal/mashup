"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
// Importa funções de eventService e djService atualizadas
import { getAllVisibleEvents, calcularValorLiquidoDJEvento } from "@/lib/eventService"; 
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Interfaces atualizadas (removido status_aprovacao)
interface DJ {
  id: string;
  nome: string;
  email?: string;
}

interface Evento {
  id: string;
  nome_evento: string;
  data: string;
  local: string;
  horario?: string;
  valor_total?: number;
  sinal_pago?: number;
  custos?: number; // Renomeado de custos_dj para custos
  percentual_dj?: number;
  dj_id: string;
  dj_nome?: string;
  status_pgto?: string;
  status_evento?: string;
  deleted?: boolean;
}

interface Fechamento {
  id?: string;
  dj_id: string;
  dj_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total_bruto: number;
  custos_total_dj: number;
  sinais_pagos_total: number;
  percentual_dj_medio?: number;
  valor_liquido_dj_total: number;
  valor_pendente_dj: number;
  status: "pendente" | "pago";
  observacoes?: string;
  comprovante_url?: string;
  created_at: any; // Firestore Timestamp
  created_by: string; // Admin UID
  eventos_incluidos: string[]; // IDs dos eventos incluídos no fechamento
}

export default function AdminFinanceiroPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [djSelecionado, setDjSelecionado] = useState<string>("");
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [todosEventos, setTodosEventos] = useState<Evento[]>([]); // Guarda todos os eventos carregados
  const [eventosFiltrados, setEventosFiltrados] = useState<Evento[]>([]); // Eventos no período/DJ
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [fechamentoAtual, setFechamentoAtual] = useState<Partial<Fechamento>>({
    valor_total_bruto: 0,
    custos_total_dj: 0,
    sinais_pagos_total: 0,
    valor_liquido_dj_total: 0,
    valor_pendente_dj: 0,
    status: "pendente",
    observacoes: "",
    eventos_incluidos: []
  });
  const [comprovantePagamento, setComprovantePagamento] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true);
      try {
        if (!user?.uid) {
          throw new Error("Usuário não autenticado");
        }
        
        // Buscar todos os DJs
        const djsRef = collection(db, "users");
        const djsQuery = query(djsRef, where("role", "==", "dj"));
        const djsSnapshot = await getDocs(djsQuery);
        const djsData = djsSnapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome || doc.data().email,
          email: doc.data().email
        }));
        setDjs(djsData);
        
        // Buscar todos os eventos (usando a função atualizada de eventService)
        const eventosData = await getAllVisibleEvents();
        setTodosEventos(eventosData);
        
        // Buscar fechamentos existentes
        const fechamentosRef = collection(db, "fechamentos");
        const fechamentosQuery = query(fechamentosRef, orderBy("created_at", "desc"));
        const fechamentosSnapshot = await getDocs(fechamentosQuery);
        const fechamentosData = fechamentosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Fechamento[];
        setFechamentos(fechamentosData);
        
        // Definir período padrão (mês atual)
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        setPeriodoInicio(primeiroDiaMes.toISOString().split("T")[0]);
        setPeriodoFim(ultimoDiaMes.toISOString().split("T")[0]);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast.error("Erro ao carregar dados iniciais");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDados();
    }
  }, [user]);

  // Recalcular resumo financeiro quando filtros mudam
  useEffect(() => {
    if (!djSelecionado || !periodoInicio || !periodoFim) {
      setEventosFiltrados([]);
      setFechamentoAtual(prev => ({ // Reseta o fechamento
        ...prev,
        valor_total_bruto: 0,
        custos_total_dj: 0,
        sinais_pagos_total: 0,
        valor_liquido_dj_total: 0,
        valor_pendente_dj: 0,
        eventos_incluidos: []
      }));
      return;
    }
    
    // Filtra eventos pelo DJ, período e status (não cancelados/deletados)
    const filtrados = todosEventos.filter(evento => {
      return (
        evento.dj_id === djSelecionado &&
        evento.data >= periodoInicio &&
        evento.data <= periodoFim &&
        evento.status_evento !== "cancelado" && // Apenas eventos não cancelados
        !evento.deleted // Garante que não está deletado
      );
    });
    
    setEventosFiltrados(filtrados);
    
    // Calcular valores para o fechamento usando os eventos filtrados
    let somaValorTotalBruto = 0;
    let somaCustosDj = 0;
    let somaSinaisPagos = 0;
    let somaValorLiquidoDj = 0;
    let primeiroPercentualDj = 70; // Padrão

    if (filtrados.length > 0) {
      primeiroPercentualDj = filtrados[0].percentual_dj || 70;
    }
    
    filtrados.forEach(evento => {
      somaValorTotalBruto += evento.valor_total || 0;
      somaCustosDj += evento.custos || 0; // Usa custos
      somaSinaisPagos += evento.sinal_pago || 0;
      // Usa a função centralizada para calcular o valor líquido de cada evento
      somaValorLiquidoDj += calcularValorLiquidoDJEvento(evento);
    });
    
    // Calcular valor pendente
    const valorPendente = somaValorLiquidoDj - somaSinaisPagos;
    
    // Atualizar fechamento atual com os valores calculados
    setFechamentoAtual(prev => ({
      ...prev,
      dj_id: djSelecionado,
      dj_nome: djs.find(dj => dj.id === djSelecionado)?.nome || "",
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      valor_total_bruto: somaValorTotalBruto,
      custos_total_dj: somaCustosDj,
      sinais_pagos_total: somaSinaisPagos,
      percentual_dj_medio: primeiroPercentualDj, // Pode ser ajustado se necessário
      valor_liquido_dj_total: somaValorLiquidoDj,
      valor_pendente_dj: valorPendente,
      eventos_incluidos: filtrados.map(e => e.id)
    }));

  }, [djSelecionado, periodoInicio, periodoFim, todosEventos, djs]);

  const formatarData = (dataISO: string | Timestamp) => {
    if (!dataISO) return "-";
    let date: Date;
    if (dataISO instanceof Timestamp) {
      date = dataISO.toDate();
    } else {
      const parts = dataISO.split("-");
      if (parts.length === 3) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        return "Data inválida";
      }
    }
    return date.toLocaleDateString("pt-BR");
  };

  const formatarValor = (valor?: number) => {
    if (valor === undefined || valor === null) return "R$ 0,00";
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleComprovantePagamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setComprovantePagamento(e.target.files[0]);
    }
  };

  // Não permitir edição manual de valores calculados no modal, apenas observações e status
  const handleFechamentoModalChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFechamentoAtual(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const uploadComprovantePagamento = async (): Promise<string | null> => {
    if (!comprovantePagamento || !fechamentoAtual.dj_id) return null;
    
    setUploading(true);
    try {
      const timestamp = new Date().getTime();
      const fileName = `fechamentos/${fechamentoAtual.dj_id}/${timestamp}_${comprovantePagamento.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, comprovantePagamento);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Erro ao fazer upload do comprovante:", error);
      toast.error("Erro ao fazer upload do comprovante");
      throw error; // Re-throw para parar o processo de salvar
    } finally {
      setUploading(false);
    }
  };

  const gerarPDF = async (fechamentoId: string) => {
    setGerando(true);
    try {
      const response = await fetch("/api/gerar-pdf-fechamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fechamentoId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao gerar PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(error.message || "Erro ao gerar PDF");
    } finally {
      setGerando(false);
    }
  };

  const handleSalvarFechamento = async () => {
    try {
      if (!user?.uid) throw new Error("Usuário não autenticado");
      if (!fechamentoAtual.dj_id || !fechamentoAtual.periodo_inicio || !fechamentoAtual.periodo_fim) {
        toast.error("Selecione o DJ e o período.");
        return;
      }
      if (!fechamentoAtual.eventos_incluidos || fechamentoAtual.eventos_incluidos.length === 0) {
        toast.error("Não há eventos no período selecionado para incluir no fechamento.");
        return;
      }
      
      let comprovanteUrlFinal = fechamentoAtual.comprovante_url; // Mantém URL existente se houver
      if (comprovantePagamento) {
        comprovanteUrlFinal = await uploadComprovantePagamento();
      }
      
      // Monta o objeto final para salvar, usando os nomes corretos da interface Fechamento
      const fechamentoData: Omit<Fechamento, "id"> = {
        dj_id: fechamentoAtual.dj_id!,
        dj_nome: fechamentoAtual.dj_nome!,
        periodo_inicio: fechamentoAtual.periodo_inicio!,
        periodo_fim: fechamentoAtual.periodo_fim!,
        valor_total_bruto: fechamentoAtual.valor_total_bruto!,
        custos_total_dj: fechamentoAtual.custos_total_dj!,
        sinais_pagos_total: fechamentoAtual.sinais_pagos_total!,
        percentual_dj_medio: fechamentoAtual.percentual_dj_medio,
        valor_liquido_dj_total: fechamentoAtual.valor_liquido_dj_total!,
        valor_pendente_dj: fechamentoAtual.valor_pendente_dj!,
        status: fechamentoAtual.status!,
        observacoes: fechamentoAtual.observacoes,
        comprovante_url: comprovanteUrlFinal || undefined,
        created_at: serverTimestamp(),
        created_by: user.uid,
        eventos_incluidos: fechamentoAtual.eventos_incluidos!
      };
      
      const docRef = await addDoc(collection(db, "fechamentos"), fechamentoData);
      
      // Adiciona ao histórico (opcional, mas boa prática)
      await addDoc(collection(db, "historico"), {
        user_id: user.uid,
        user_email: user.email,
        user_nome: user.displayName || user.email,
        user_role: "admin",
        acao: "fechamento_criado",
        timestamp: serverTimestamp(),
        detalhes: {
          fechamento_id: docRef.id,
          dj_id: fechamentoData.dj_id,
          dj_nome: fechamentoData.dj_nome,
          periodo: `${formatarData(fechamentoData.periodo_inicio)} a ${formatarData(fechamentoData.periodo_fim)}`,
          valor_liquido_dj: fechamentoData.valor_liquido_dj_total
        }
      });

      // Atualiza a lista local de fechamentos
      const novoFechamento: Fechamento = {
        id: docRef.id,
        ...fechamentoData,
        created_at: new Date() // Usa data local para exibição imediata
      };
      setFechamentos(prev => [novoFechamento, ...prev].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
      
      toast.success("Fechamento criado com sucesso!");
      setShowFechamentoModal(false);
      setComprovantePagamento(null); // Limpa o comprovante
      
      // Pergunta se deseja gerar o PDF
      if (window.confirm("Deseja gerar o PDF do fechamento agora?")) {
        await gerarPDF(docRef.id);
      }

    } catch (error: any) {
      console.error("Erro ao salvar fechamento:", error);
      toast.error(error.message || "Erro ao salvar fechamento");
    }
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6">Financeiro Admin</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content bg-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Financeiro Admin</h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFechamentoModal(true)}
              disabled={!djSelecionado || eventosFiltrados.length === 0} // Desabilita se não houver DJ ou eventos
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Novo Fechamento Financeiro
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="content-card bg-white mb-6">
          <h2 className="section-title">Filtrar Eventos para Fechamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="djSelect" className="block text-sm font-medium text-gray-700 mb-1">DJ</label>
              <select
                id="djSelect"
                value={djSelecionado}
                onChange={(e) => setDjSelecionado(e.target.value)}
                className="form-input"
              >
                <option value="">Selecione um DJ</option>
                {djs.map(dj => (
                  <option key={dj.id} value={dj.id}>{dj.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="periodoInicio" className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                id="periodoInicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="periodoFim" className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                id="periodoFim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="content-card bg-white mb-6">
          <h2 className="section-title">Resumo Financeiro</h2>
          
          {!djSelecionado ? (
            <div className="text-center py-4 text-gray-500">
              Selecione um DJ para visualizar o resumo financeiro.
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Nenhum evento encontrado no período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Valor Total Bruto</h3>
                <p className="text-2xl font-bold text-gray-900">{formatarValor(fechamentoAtual.valor_total_bruto)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Custos do DJ</h3>
                <p className="text-2xl font-bold text-gray-900">{formatarValor(fechamentoAtual.custos_total_dj)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Valor Líquido do DJ</h3>
                <p className="text-2xl font-bold text-blue-600">{formatarValor(fechamentoAtual.valor_liquido_dj_total)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Valor Pendente</h3>
                <p className="text-2xl font-bold text-red-600">{formatarValor(fechamentoAtual.valor_pendente_dj)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Eventos */}
        <div className="content-card bg-white mb-6">
          <h2 className="section-title">Eventos no Período</h2>
          
          {!djSelecionado ? (
            <div className="text-center py-4 text-gray-500">
              Selecione um DJ para visualizar os eventos.
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Nenhum evento encontrado no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custos</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Líquido DJ</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventosFiltrados.map(evento => (
                    <tr key={evento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatarData(evento.data)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{evento.nome_evento}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{evento.local}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatarValor(evento.valor_total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatarValor(evento.custos)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{formatarValor(calcularValorLiquidoDJEvento(evento))}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          evento.status_evento === 'cancelado' ? 'bg-red-100 text-red-800' : 
                          evento.status_evento === 'adiado' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {evento.status_evento || 'confirmado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lista de Fechamentos */}
        <div className="content-card bg-white">
          <h2 className="section-title">Fechamentos Anteriores</h2>
          
          {fechamentos.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Nenhum fechamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DJ</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Líquido</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fechamentos.map(fechamento => (
                    <tr key={fechamento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fechamento.created_at instanceof Date 
                          ? fechamento.created_at.toLocaleDateString("pt-BR") 
                          : fechamento.created_at?.toDate?.() 
                            ? fechamento.created_at.toDate().toLocaleDateString("pt-BR")
                            : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fechamento.dj_nome}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarData(fechamento.periodo_inicio)} a {formatarData(fechamento.periodo_fim)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                        {formatarValor(fechamento.valor_liquido_dj_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fechamento.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {fechamento.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => gerarPDF(fechamento.id!)}
                          disabled={gerando}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          {gerando ? "Gerando..." : "Gerar PDF"}
                        </button>
                        {fechamento.comprovante_url && (
                          <a 
                            href={fechamento.comprovante_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Comprovante
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Fechamento */}
        {showFechamentoModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Novo Fechamento Financeiro</h2>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">DJ: {fechamentoAtual.dj_nome}</h3>
                <h3 className="font-medium mb-2">Período: {formatarData(fechamentoAtual.periodo_inicio!)} a {formatarData(fechamentoAtual.periodo_fim!)}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total Bruto</label>
                  <p className="form-input bg-gray-100">{formatarValor(fechamentoAtual.valor_total_bruto)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custos do DJ</label>
                  <p className="form-input bg-gray-100">{formatarValor(fechamentoAtual.custos_total_dj)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Líquido do DJ</label>
                  <p className="form-input bg-gray-100">{formatarValor(fechamentoAtual.valor_liquido_dj_total)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pendente</label>
                  <p className="form-input bg-gray-100">{formatarValor(fechamentoAtual.valor_pendente_dj)}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="status"
                  name="status"
                  value={fechamentoAtual.status}
                  onChange={handleFechamentoModalChange}
                  className="form-input"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={fechamentoAtual.observacoes || ""}
                  onChange={handleFechamentoModalChange}
                  rows={3}
                  className="form-input"
                  placeholder="Observações sobre o fechamento..."
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label htmlFor="comprovante" className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Pagamento</label>
                <input
                  id="comprovante"
                  type="file"
                  onChange={handleComprovantePagamentoChange}
                  className="form-input"
                  accept="image/*,application/pdf"
                />
                <p className="text-xs text-gray-500 mt-1">Formatos aceitos: JPG, PNG, PDF</p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowFechamentoModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarFechamento}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Salvando..." : "Salvar Fechamento"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  );
}
