"use client";

import { useState, useEffect, useRef } from "react";
import { Evento, getVisibleDjEvents } from "@/lib/djService"; // Usar djService para buscar eventos do DJ
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// FullCalendar e plugins
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Interface para Evento do Calendário (simplificada para DJ)
interface EventoCalendarioDJ {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    local: string;
    horario: string;
    valor_total: number;
    custos: number;
    status_pgto: string;
    tipo_evento: string;
    contratante_nome: string;
    observacoes: string;
  };
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export default function AgendaDjPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendarioDJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"planilha" | "calendario">("planilha");
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendarioDJ | null>(null);
  const [showModal, setShowModal] = useState(false);
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    const fetchEventos = async () => {
      setLoading(true);
      try {
        if (!user?.uid) {
          console.log("[AgendaDJ] Usuário não autenticado, aguardando...");
          return; 
        }
        
        console.log(`[AgendaDJ] Buscando eventos para DJ: ${user.uid}`);
        const eventosData = await getVisibleDjEvents(user.uid);
        console.log(`[AgendaDJ] Eventos recebidos: ${eventosData.length}`);
        setEventos(eventosData);
      } catch (error: any) {
        console.error("[AgendaDJ] Erro ao carregar eventos:", error);
        toast.error(`Erro ao carregar eventos: ${error.message || "Erro desconhecido"}`);
        setEventos([]); 
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEventos();
    } else {
      setLoading(true);
    }
  }, [user]);

  // Converter eventos para formato do FullCalendar
  useEffect(() => {
    const convertedEvents = eventos.map(evento => {
      let backgroundColor = "#4B5563"; // Cinza (padrão)
      let borderColor = "#374151";
      let textColor = "#FFFFFF";
      
      if (evento.status_pgto === "quitado") {
        backgroundColor = "#10B981"; // Verde
        borderColor = "#059669";
      } else if (evento.status_pgto === "parcial") {
        backgroundColor = "#F59E0B"; // Amarelo
        borderColor = "#D97706";
      } else if (evento.status_pgto === "pendente") {
        backgroundColor = "#6B7280"; // Cinza
        borderColor = "#4B5563";
      } else if (evento.status_pgto === "cancelado") {
        backgroundColor = "#EF4444"; // Vermelho
        borderColor = "#DC2626";
      }

      const eventoCal: EventoCalendarioDJ = {
        id: evento.id,
        title: evento.nome_evento || "Evento sem nome",
        start: `${evento.data}${evento.horario ? `T${evento.horario}:00` : ''}`,
        allDay: !evento.horario,
        extendedProps: {
          local: evento.local || "",
          horario: evento.horario || "",
          valor_total: evento.valor_total || 0,
          custos: evento.custos || evento.custos_dj || 0, // Considera ambos os campos de custo
          status_pgto: evento.status_pgto || "pendente",
          tipo_evento: evento.tipo_evento || "",
          contratante_nome: evento.contratante_nome || "",
          observacoes: evento.observacoes || ""
        },
        backgroundColor,
        borderColor,
        textColor
      };
      return eventoCal;
    });
    setEventosCalendario(convertedEvents);
  }, [eventos]);

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    try {
      const [ano, mes, dia] = dataISO.split("-");
      if (!ano || !mes || !dia || ano.length !== 4 || mes.length !== 2 || dia.length !== 2) {
        throw new Error("Formato de data inválido");
      }
      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      console.warn(`[AgendaDJ] Erro ao formatar data: ${dataISO}`, error);
      return dataISO;
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    if (status === "cancelado") return "🚫"; // Adicionado ícone para cancelado
    return "❓";
  };

  // Função para lidar com clique em evento no calendário
  const handleEventClick = (info: any) => {
    setEventoSelecionado(info.event);
    setShowModal(true);
  };

  // Função para navegar para detalhes do evento
  const navigateToEventDetails = (eventId: string) => {
    router.push(`/dashboard/dj/eventos/${eventId}`);
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
            Planilha
          </button>
          <button
            onClick={() => setViewMode("calendario")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "calendario"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Calendário
          </button>
          <Link
            href="/dashboard/dj/create-event"
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 ml-auto"
          >
            Adicionar Novo Evento
          </Link>
        </div>
      </div>

      {viewMode === "planilha" ? (
        // Visualização em Planilha (código existente)
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
                      <td className="px-4 py-3 text-gray-800">{evento.nome_evento}</td>
                      <td className="px-4 py-3 text-gray-800">{evento.local}</td>
                      <td className="px-4 py-3 text-gray-800">{evento.horario || "-"}</td>
                      <td className="px-4 py-3 text-gray-800">R$ {(evento.valor_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">R$ {(evento.custos || evento.custos_dj || 0).toFixed(2)}</td>
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
        // Visualização em Calendário (Implementação com FullCalendar)
        <div className="bg-white rounded-lg shadow-md p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={eventosCalendario}
            locale={ptBR}
            buttonText={{
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
            }}
            eventClick={handleEventClick}
            editable={false} // DJ não pode arrastar eventos
            droppable={false}
            selectable={false} // DJ não pode selecionar datas para criar evento rápido
            height="auto" // Ajusta altura automaticamente
            contentHeight="auto"
            aspectRatio={1.8}
          />
        </div>
      )}

      {/* Modal de Detalhes do Evento (Simplificado) */}
      {showModal && eventoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">{eventoSelecionado.title}</h3>
            <p><strong>Data:</strong> {formatarData(eventoSelecionado.start.split('T')[0])}</p>
            {eventoSelecionado.extendedProps.horario && <p><strong>Horário:</strong> {eventoSelecionado.extendedProps.horario}</p>}
            <p><strong>Local:</strong> {eventoSelecionado.extendedProps.local}</p>
            <p><strong>Valor Total:</strong> R$ {eventoSelecionado.extendedProps.valor_total.toFixed(2)}</p>
            <p><strong>Custos:</strong> R$ {eventoSelecionado.extendedProps.custos.toFixed(2)}</p>
            <p><strong>Status Pgto:</strong> {getStatusIcon(eventoSelecionado.extendedProps.status_pgto)} {eventoSelecionado.extendedProps.status_pgto}</p>
            {eventoSelecionado.extendedProps.tipo_evento && <p><strong>Tipo:</strong> {eventoSelecionado.extendedProps.tipo_evento}</p>}
            {eventoSelecionado.extendedProps.contratante_nome && <p><strong>Contratante:</strong> {eventoSelecionado.extendedProps.contratante_nome}</p>}
            {eventoSelecionado.extendedProps.observacoes && <p><strong>Obs:</strong> {eventoSelecionado.extendedProps.observacoes}</p>}
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => navigateToEventDetails(eventoSelecionado.id)}
                className="btn-primary"
              >
                Ver Detalhes Completos
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

