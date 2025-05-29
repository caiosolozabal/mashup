"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getEventById, Evento, deleteEvent } from "@/lib/eventService";
import Link from "next/link";
import { toast } from "sonner";

export default function EventoDetalhesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        if (!user?.uid) {
          throw new Error("Usuário não autenticado");
        }

        if (!id || typeof id !== "string") {
          throw new Error("ID do evento inválido");
        }

        const eventoData = await getEventById(id);
        
        if (!eventoData) {
          throw new Error("Evento não encontrado");
        }

        // Verificar se o evento pertence ao DJ logado
        if (eventoData.dj_id !== user.uid && user.role !== "admin") {
          throw new Error("Você não tem permissão para visualizar este evento");
        }

        setEvento(eventoData);
      } catch (error) {
        console.error("Erro ao carregar evento:", error);
        setError(error instanceof Error ? error.message : "Erro ao carregar evento");
        toast.error("Erro ao carregar detalhes do evento");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEvento();
    }
  }, [id, user]);

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const getStatusAprovacao = (status?: string) => {
    if (status === "aprovado") return <span className="text-green-600 font-medium">Aprovado</span>;
    if (status === "rejeitado") return <span className="text-red-600 font-medium">Rejeitado</span>;
    if (status === "pendente") return <span className="text-yellow-600 font-medium">Aguardando Aprovação</span>;
    return <span className="text-gray-600">-</span>;
  };

  const getStatusPagamento = (status?: string) => {
    if (status === "quitado") return <span className="text-green-600 font-medium">Quitado</span>;
    if (status === "parcial") return <span className="text-yellow-600 font-medium">Parcial</span>;
    if (status === "pendente") return <span className="text-red-600 font-medium">Pendente</span>;
    return <span className="text-gray-600">-</span>;
  };

  const handleDeleteEvent = async () => {
    if (!user?.uid || !id || typeof id !== "string") {
      toast.error("Não foi possível excluir o evento");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteEvent(id, user.uid);
      toast.success("Evento excluído com sucesso");
      router.push("/dashboard/dj/agenda");
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      toast.error("Erro ao excluir evento");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Detalhes do Evento</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Detalhes do Evento</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Erro ao carregar evento</p>
          <p>{error}</p>
        </div>
        <Link 
          href="/dashboard/dj/agenda" 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          Voltar para Agenda
        </Link>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Detalhes do Evento</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
          <p>Evento não encontrado ou você não tem permissão para visualizá-lo.</p>
        </div>
        <Link 
          href="/dashboard/dj/agenda" 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          Voltar para Agenda
        </Link>
      </div>
    );
  }

  // Calcular valor líquido do DJ
  const valorTotal = evento.valor_total || 0;
  const custos = evento.custos || evento.custos_dj || 0;
  const percentualDj = evento.percentual_dj || 70;
  const valorBaseCalculo = valorTotal - custos;
  const valorLiquidoDj = custos + (valorBaseCalculo * (percentualDj / 100));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Detalhes do Evento</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-blue-700">{evento.nome_evento}</h2>
            <p className="text-gray-600">{formatarData(evento.data)} às {evento.horario || "--:--"}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {evento.tipo_evento || "Evento"}
            </div>
            <div className="mt-2">
              {getStatusAprovacao(evento.status_aprovacao)}
            </div>
          </div>
        </div>
        
        {evento.status_aprovacao === "rejeitado" && evento.motivo_rejeicao && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="font-medium text-red-700 mb-1">Motivo da Rejeição:</h3>
            <p className="text-red-600">{evento.motivo_rejeicao}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informações do Evento</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Local</p>
                <p className="font-medium">{evento.local || "-"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Tipo de Evento</p>
                <p className="font-medium">{evento.tipo_evento || "-"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status do Evento</p>
                <p className="font-medium">{evento.status_evento || "-"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">ID Interno</p>
                <p className="font-medium">{evento.id_interno || "-"}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informações do Contratante</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium">{evento.contratante_nome || "-"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Contato</p>
                <p className="font-medium">{evento.contratante_contato || "-"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informações Financeiras</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Valor Total</p>
                <p className="font-medium">R$ {valorTotal.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Custos</p>
                <p className="font-medium">R$ {custos.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Percentual do DJ</p>
                <p className="font-medium">{percentualDj}%</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Valor Líquido (DJ)</p>
                <p className="font-medium text-green-600">R$ {valorLiquidoDj.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status do Pagamento</p>
                <p className="font-medium">{getStatusPagamento(evento.status_pgto)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Sinal Pago</p>
                <p className="font-medium">R$ {(evento.sinal_pago || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Comprovantes de Custos</h3>
            
            {evento.comprovantes_custos && evento.comprovantes_custos.length > 0 ? (
              <div className="space-y-3">
                {evento.comprovantes_custos.map((url, index) => (
                  <div key={index} className="border rounded-md p-3">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Comprovante {index + 1}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhum comprovante anexado.</p>
            )}
          </div>
        </div>
        
        {evento.observacoes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Observações</h3>
            <p className="whitespace-pre-line">{evento.observacoes}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-3 mt-8">
          <Link 
            href="/dashboard/dj/agenda" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
          >
            Voltar para Agenda
          </Link>
          
          {evento.status_aprovacao !== "rejeitado" && (
            <Link 
              href={`/dashboard/dj/edit-event/${evento.id}`}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Editar Evento
            </Link>
          )}
          
          {/* Botão de Excluir Evento */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Excluir Evento
          </button>
        </div>
      </div>
      
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir o evento <span className="font-medium">{evento.nome_evento}</span>?
                <br />
                Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Excluindo...
                    </>
                  ) : (
                    "Sim, Excluir"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
