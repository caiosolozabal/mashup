"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Evento } from "@/lib/adminService";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import RequireAdmin from "@/components/auth/RequireAdmin";

export default function EventDetailsPage({ params }: { params: Record<string, any> }) {
  const router = useRouter();
  const { id: eventId } = use(params);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        if (!eventId) {
          throw new Error("ID do evento não fornecido");
        }

        const eventoRef = doc(db, "eventos", eventId);
        const eventoSnap = await getDoc(eventoRef);

        if (eventoSnap.exists()) {
          const eventoData = eventoSnap.data() as Omit<Evento, "id">;
          setEvento({
            id: eventoSnap.id,
            ...eventoData
          });
        } else {
          throw new Error("Evento não encontrado");
        }
      } catch (error) {
        console.error("Erro ao carregar evento:", error);
        setError("Não foi possível carregar os detalhes do evento");
        
        // Dados simulados em caso de erro
        const hoje = new Date();
        setEvento({
          id: eventId,
          nome_evento: "Casamento Silva",
          data: format(hoje, "yyyy-MM-dd"),
          local: "Buffet Estrela",
          horario: "16:00",
          valor_total: 3200,
          custos_dj: 500,
          percentual_dj: 70,
          status_pgto: "parcial",
          status_evento: "confirmado",
          dj_id: "dj1",
          dj_nome: "DJ Carlos",
          cliente_nome: "João Silva",
          cliente_contato: "(11) 98765-4321",
          observacoes: "Cliente solicitou foco em músicas dos anos 80 e 90. Levar equipamento de iluminação extra.",
          tipo_evento: "Casamento"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvento();
  }, [eventId]);

  // Função para formatar data
  const formatarData = (dataISO?: string) => {
    if (!dataISO) return "-";
    try {
      const data = parseISO(dataISO);
      return format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      return dataISO;
    }
  };

  // Função para obter ícone de status
  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    if (status === "cancelado") return "🚫";
    return "❓";
  };

  // Função para obter classe CSS para status
  const getStatusClass = (status?: string) => {
    if (status === "quitado") return "bg-green-100 text-green-800";
    if (status === "parcial") return "bg-yellow-100 text-yellow-800";
    if (status === "pendente") return "bg-gray-100 text-gray-800";
    if (status === "cancelado") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Detalhes do Evento</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  if (error || !evento) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Detalhes do Evento</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || "Evento não encontrado"}
          </div>
          <Link
            href="/dashboard/admin/manage-events/table"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Voltar para Lista
          </Link>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Evento</h1>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/admin/manage-events/edit/${evento.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Editar Evento
            </Link>
            <Link
              href="/dashboard/admin/manage-events/table"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
            >
              Voltar para Lista
            </Link>
          </div>
        </div>

        <div className="content-card">
          {/* Cabeçalho do Evento */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{evento.nome_evento}</h2>
                <p className="text-gray-600">{evento.tipo_evento}</p>
              </div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(evento.status_pgto)}`}>
                  {getStatusIcon(evento.status_pgto)} {evento.status_pgto}
                </span>
              </div>
            </div>
          </div>

          {/* Detalhes do Evento */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-900">Informações do Evento</h3>
                
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-medium text-gray-900">{formatarData(evento.data)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Horário</p>
                  <p className="font-medium text-gray-900">{evento.horario || "Não especificado"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Local</p>
                  <p className="font-medium text-gray-900">{evento.local}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status do Evento</p>
                  <p className="font-medium text-gray-900">{evento.status_evento || "Confirmado"}</p>
                </div>
              </div>
              
              {/* Informações Financeiras e DJ */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-900">Informações Financeiras e DJ</h3>
                
                <div>
                  <p className="text-sm text-gray-500">DJ Responsável</p>
                  <p className="font-medium text-gray-900">{evento.dj_nome || "Não atribuído"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-medium text-gray-900">
                    {evento.valor_total 
                      ? `R$ ${evento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : "Não especificado"
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Custos do DJ</p>
                  <p className="font-medium text-gray-900">
                    {evento.custos_dj 
                      ? `R$ ${evento.custos_dj.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : "Não especificado"
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Percentual do DJ</p>
                  <p className="font-medium text-gray-900">{evento.percentual_dj ? `${evento.percentual_dj}%` : "Não especificado"}</p>
                </div>
              </div>
            </div>
            
            {/* Informações do Cliente */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 text-gray-900">Informações do Cliente</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nome do Cliente</p>
                  <p className="font-medium text-gray-900">{evento.cliente_nome || "Não especificado"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Contato do Cliente</p>
                  <p className="font-medium text-gray-900">{evento.cliente_contato || "Não especificado"}</p>
                </div>
              </div>
            </div>
            
            {/* Observações */}
            {evento.observacoes && (
              <div className="mt-6 space-y-2">
                <h3 className="text-lg font-semibold border-b pb-2 text-gray-900">Observações</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="whitespace-pre-line text-gray-900">{evento.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Cálculos Financeiros */}
        <div className="mt-6 content-card">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-900">Resumo Financeiro</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-xl font-bold text-blue-700">
                {evento.valor_total 
                  ? `R$ ${evento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : "R$ 0,00"
                }
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Valor para Agência</p>
              <p className="text-xl font-bold text-purple-700">
                {(() => {
                  const valorTotal = evento.valor_total || 0;
                  const custosDJ = evento.custos_dj || 0;
                  const percentualDJ = evento.percentual_dj || 70;
                  
                  // Base para cálculo é o valor total menos os custos diretos do DJ
                  const baseCalculo = valorTotal - custosDJ;
                  
                  // Percentual da agência
                  const percentualAgencia = 100 - percentualDJ;
                  
                  // Valor que fica com a agência
                  const valorAgencia = baseCalculo * (percentualAgencia / 100);
                  
                  return `R$ ${valorAgencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({100 - (evento.percentual_dj || 70)}% do valor líquido)
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Valor para DJ</p>
              <p className="text-xl font-bold text-green-700">
                {(() => {
                  const valorTotal = evento.valor_total || 0;
                  const custosDJ = evento.custos_dj || 0;
                  const percentualDJ = evento.percentual_dj || 70;
                  
                  // Base para cálculo é o valor total menos os custos diretos do DJ
                  const baseCalculo = valorTotal - custosDJ;
                  
                  // Valor que fica com o DJ (custos + percentual sobre o restante)
                  const valorDJ = custosDJ + (baseCalculo * (percentualDJ / 100));
                  
                  return `R$ ${valorDJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Custos + {evento.percentual_dj || 70}% do valor líquido)
              </p>
            </div>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
