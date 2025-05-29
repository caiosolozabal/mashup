"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// FullCalendar e plugins
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Interface atualizada para Evento
interface Evento {
  id: string;
  nome_evento?: string;
  data: string; 
  local: string;
  horario?: string;
  valor_total?: number;
  sinal_pago?: number;
  conta_recebimento?: string;
  status_pgto?: string;
  dj_id?: string;
  dj_nome?: string;
  contratante_nome?: string;
  contratante_contato?: string;
  observacoes?: string;
  tipo_evento?: string;
  id_interno?: string;
}

interface EventoCalendario {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    local: string;
    dj_nome: string;
    valor_total: number;
    sinal_pago: number;
    conta_recebimento: string;
    status_pgto: string;
    horario: string;
    tipo_evento: string;
    contratante_nome: string;
    contratante_contato: string;
    id_interno: string;
    observacoes: string;
  };
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

// Interface para DJ
interface DJ {
  id: string;
  nome: string;
  email?: string;
  percentual_padrao?: number;
}

export default function EventsCalendarPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendario | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [djs, setDjs] = useState<DJ[]>([]);
  const calendarRef = useRef<any>(null);

  // Estado do formulário rápido
  const [quickFormData, setQuickFormData] = useState({
    nome_evento: "",
    data: "",
    local: "",
    horario: "",
    valor_total: "",
    dj_id: "",
    tipo_evento: "",
  });

  // Carregar eventos e DJs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar eventos
        const eventosQuery = query(
          collection(db, "eventos"),
          orderBy("data", "asc")
        );
        
        const eventosSnapshot = await getDocs(eventosQuery);
        const eventosList: Evento[] = [];
        
        eventosSnapshot.forEach(doc => {
          const eventoData = doc.data() as Omit<Evento, "id">;
          eventosList.push({
            id: doc.id,
            ...eventoData
          });
        });
        
        setEventos(eventosList);

        // Buscar DJs
        const djsCollection = collection(db, "djs");
        const djsSnapshot = await getDocs(djsCollection);
        const djsList: DJ[] = [];
        
        djsSnapshot.forEach(doc => {
          const djData = doc.data() as Omit<DJ, "id">;
          djsList.push({
            id: doc.id,
            ...djData
          });
        });
        
        if (djsList.length > 0) {
          setDjs(djsList);
        } else {
          // Dados simulados caso não haja DJs no Firestore
          const mockDJs: DJ[] = [
            { id: "dj1", nome: "DJ Carlos", percentual_padrao: 70 },
            { id: "dj2", nome: "DJ Mariana", percentual_padrao: 75 },
            { id: "dj3", nome: "DJ Rafael", percentual_padrao: 70 },
          ];
          setDjs(mockDJs);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do calendário");
        
        // Dados simulados em caso de erro
        const hoje = new Date();
        const mockEventos: Evento[] = [
          {
            id: "evt1",
            nome_evento: "Casamento Silva",
            data: format(new Date(hoje.getFullYear(), hoje.getMonth(), 5), "yyyy-MM-dd"),
            local: "Buffet Estrela",
            horario: "16:00",
            valor_total: 3200,
            sinal_pago: 1000,
            conta_recebimento: "Nubank",
            status_pgto: "parcial",
            dj_id: "dj1",
            dj_nome: "DJ Carlos",
            contratante_nome: "João Silva",
            contratante_contato: "(11) 98765-4321",
            tipo_evento: "Casamento",
            id_interno: "EVT-2025-001"
          },
          {
            id: "evt2",
            nome_evento: "Formatura Medicina",
            data: format(new Date(hoje.getFullYear(), hoje.getMonth(), 12), "yyyy-MM-dd"),
            local: "Centro de Convenções",
            horario: "20:00",
            valor_total: 4500,
            sinal_pago: 0,
            status_pgto: "pendente",
            dj_id: "dj2",
            dj_nome: "DJ Mariana",
            contratante_nome: "Universidade Federal",
            contratante_contato: "(11) 3456-7890",
            tipo_evento: "Formatura",
            id_interno: "EVT-2025-002"
          },
          {
            id: "evt3",
            nome_evento: "Festa Corporativa XYZ",
            data: format(new Date(hoje.getFullYear(), hoje.getMonth(), 18), "yyyy-MM-dd"),
            local: "Hotel Premium",
            horario: "19:00",
            valor_total: 2800,
            sinal_pago: 2800,
            conta_recebimento: "Itaú",
            status_pgto: "quitado",
            dj_id: "dj3",
            dj_nome: "DJ Rafael",
            contratante_nome: "Empresa XYZ",
            contratante_contato: "(11) 2345-6789",
            tipo_evento: "Corporativo",
            id_interno: "EVT-2025-003"
          },
          {
            id: "evt4",
            nome_evento: "Aniversário 15 Anos",
            data: format(new Date(hoje.getFullYear(), hoje.getMonth(), 25), "yyyy-MM-dd"),
            local: "Salão de Festas Luxo",
            horario: "18:00",
            valor_total: 3500,
            sinal_pago: 3500,
            conta_recebimento: "PicPay",
            status_pgto: "quitado",
            dj_id: "dj1",
            dj_nome: "DJ Carlos",
            contratante_nome: "Maria Oliveira",
            contratante_contato: "(11) 3456-7890",
            tipo_evento: "Aniversário",
            id_interno: "EVT-2025-004"
          },
          {
            id: "evt5",
            nome_evento: "Festa de Fim de Ano",
            data: format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 15), "yyyy-MM-dd"),
            local: "Clube Recreativo",
            horario: "21:00",
            valor_total: 5000,
            sinal_pago: 2000,
            conta_recebimento: "Nubank",
            status_pgto: "parcial",
            dj_id: "dj2",
            dj_nome: "DJ Mariana",
            contratante_nome: "Empresa ABC",
            contratante_contato: "(11) 2345-6789",
            tipo_evento: "Corporativo",
            id_interno: "EVT-2025-005"
          }
        ];
        
        setEventos(mockEventos);
        
        // Dados simulados de DJs
        const mockDJs: DJ[] = [
          { id: "dj1", nome: "DJ Carlos", percentual_padrao: 70 },
          { id: "dj2", nome: "DJ Mariana", percentual_padrao: 75 },
          { id: "dj3", nome: "DJ Rafael", percentual_padrao: 70 },
        ];
        setDjs(mockDJs);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Converter eventos para formato do FullCalendar
  useEffect(() => {
    const convertedEvents = eventos.map(evento => {
      // Definir cores com base no status de pagamento
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
        textColor = "#FFFFFF";
      }
      
      // Criar objeto de evento para o calendário
      const eventoCalendario: EventoCalendario = {
        id: evento.id,
        title: evento.nome_evento || "Evento sem nome",
        start: `${evento.data}${evento.horario ? `T${evento.horario}:00` : ''}`,
        allDay: !evento.horario,
        extendedProps: {
          local: evento.local || "",
          dj_nome: evento.dj_nome || "Não atribuído",
          valor_total: evento.valor_total || 0,
          sinal_pago: evento.sinal_pago || 0,
          conta_recebimento: evento.conta_recebimento || "",
          status_pgto: evento.status_pgto || "pendente",
          horario: evento.horario || "",
          tipo_evento: evento.tipo_evento || "",
          contratante_nome: evento.contratante_nome || "",
          contratante_contato: evento.contratante_contato || "",
          id_interno: evento.id_interno || "",
          observacoes: evento.observacoes || ""
        },
        backgroundColor,
        borderColor,
        textColor
      };
      
      return eventoCalendario;
    });
    
    setEventosCalendario(convertedEvents);
  }, [eventos]);
  
  // Função para formatar data
  const formatarData = (dataISO: string) => {
    if (!dataISO) return "-";
    try {
      const data = parseISO(dataISO);
      return format(data, "dd/MM/yyyy", { locale: ptBR });
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
  
  // Função para lidar com clique em evento
  const handleEventClick = (info: any) => {
    setEventoSelecionado(info.event);
    setShowModal(true);
  };
  
  // Função para lidar com clique em data
  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setQuickFormData(prev => ({
      ...prev,
      data: info.dateStr,
      horario: "19:00" // Horário padrão
    }));
    setShowCreateModal(true);
  };
  
  // Função para navegar para hoje
  const goToToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };
  
  // Função para mudar visualização
  const changeView = (viewName: string) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewName);
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Converte para número e formata como moeda
    if (numericValue) {
      const floatValue = parseFloat(numericValue) / 100;
      return floatValue.toFixed(2);
    }
    return '';
  };

  // Manipular mudanças no formulário rápido
  const handleQuickFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Aplicar formatação específica para cada campo
    let formattedValue = value;
    
    if (name === 'valor_total') {
      formattedValue = formatCurrency(value);
    }
    
    setQuickFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  // Enviar formulário rápido
  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!quickFormData.nome_evento || !quickFormData.data || !quickFormData.local || !quickFormData.dj_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    try {
      // Encontrar o DJ selecionado
      const djSelecionado = djs.find(dj => dj.id === quickFormData.dj_id);
      
      // Preparar dados do evento
      const eventoData = {
        nome_evento: quickFormData.nome_evento.trim(),
        data: quickFormData.data,
        local: quickFormData.local.trim(),
        horario: quickFormData.horario,
        valor_total: quickFormData.valor_total ? parseFloat(quickFormData.valor_total) : 0,
        sinal_pago: 0,
        conta_recebimento: "",
        status_pgto: "pendente",
        dj_id: quickFormData.dj_id,
        dj_nome: djSelecionado?.nome || "",
        contratante_nome: "",
        contratante_contato: "",
        observacoes: "",
        tipo_evento: quickFormData.tipo_evento.trim(),
        id_interno: "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      // Adicionar evento ao Firestore
      await addDoc(collection(db, "eventos"), eventoData);
      
      toast.success("Evento criado com sucesso!");
      
      // Atualizar lista de eventos (simplificado para este exemplo)
      const novoEvento: Evento = {
        id: `temp-${Date.now()}`, // ID temporário
        ...eventoData,
        data: eventoData.data as string
      };
      
      setEventos(prev => [...prev, novoEvento]);
      
      // Fechar modal e limpar formulário
      setShowCreateModal(false);
      setQuickFormData({
        nome_evento: "",
        data: "",
        local: "",
        horario: "",
        valor_total: "",
        dj_id: "",
        tipo_evento: "",
      });
      
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      toast.error("Erro ao criar evento");
    }
  };

  // Função para navegar para detalhes do evento
  const navigateToEventDetails = (eventId: string) => {
    router.push(`/dashboard/admin/manage-events/details/${eventId}`);
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Visualização em Calendário</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Visualização em Calendário</h1>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/manage-events/create"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Novo Evento
            </Link>
            <Link
              href="/dashboard/admin/manage-events/table"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Ver Planilha
            </Link>
            <Link
              href="/dashboard/admin"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Controles do Calendário */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={goToToday}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => changeView('dayGridMonth')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
            >
              Mês
            </button>
            <button
              onClick={() => changeView('timeGridWeek')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
            >
              Semana
            </button>
            <button
              onClick={() => changeView('timeGridDay')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
            >
              Dia
            </button>
          </div>
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next',
                center: 'title',
                right: ''
              }}
              events={eventosCalendario}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              height="auto"
              locale="pt-br"
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
              }}
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              eventContent={(eventInfo) => {
                return (
                  <div className="fc-event-main-frame p-1">
                    <div className="fc-event-title-container">
                      <div className="fc-event-title font-medium">
                        {eventInfo.event.title}
                      </div>
                      {eventInfo.view.type === 'dayGridMonth' && (
                        <div className="text-xs opacity-90">
                          {eventInfo.event.extendedProps.dj_nome}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
        
        {/* Legenda de Status */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Legenda de Status:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>
              <span className="text-sm">✅ Quitado</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-yellow-500 rounded-full mr-2"></span>
              <span className="text-sm">⚠️ Parcial</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-gray-500 rounded-full mr-2"></span>
              <span className="text-sm">🕒 Pendente</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>
              <span className="text-sm">🚫 Cancelado</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Dica: Clique em uma data para criar um evento rapidamente ou clique em um evento existente para ver detalhes.
          </p>
        </div>
      </div>
      
      {/* Modal de Detalhes do Evento */}
      {showModal && eventoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{eventoSelecionado.title}</h2>
                  {eventoSelecionado.extendedProps.id_interno && (
                    <p className="text-sm text-gray-500">ID: {eventoSelecionado.extendedProps.id_interno}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">
                    {formatarData(eventoSelecionado.start.toString())}
                    {eventoSelecionado.extendedProps.horario && ` às ${eventoSelecionado.extendedProps.horario}`}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{eventoSelecionado.extendedProps.local}</span>
                </div>
                
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">{eventoSelecionado.extendedProps.dj_nome}</span>
                </div>
                
                {eventoSelecionado.extendedProps.tipo_evento && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <span className="text-gray-700">{eventoSelecionado.extendedProps.tipo_evento}</span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">
                    R$ {eventoSelecionado.extendedProps.valor_total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">
                    Status: {getStatusIcon(eventoSelecionado.extendedProps.status_pgto)} {eventoSelecionado.extendedProps.status_pgto.charAt(0).toUpperCase() + eventoSelecionado.extendedProps.status_pgto.slice(1)}
                  </span>
                </div>
                
                {eventoSelecionado.extendedProps.sinal_pago > 0 && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-gray-700">
                      Sinal: R$ {eventoSelecionado.extendedProps.sinal_pago.toFixed(2).replace('.', ',')}
                      {eventoSelecionado.extendedProps.conta_recebimento && ` (${eventoSelecionado.extendedProps.conta_recebimento})`}
                    </span>
                  </div>
                )}
                
                {eventoSelecionado.extendedProps.contratante_nome && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700">
                      Contratante: {eventoSelecionado.extendedProps.contratante_nome}
                      {eventoSelecionado.extendedProps.contratante_contato && ` - ${eventoSelecionado.extendedProps.contratante_contato}`}
                    </span>
                  </div>
                )}
                
                {eventoSelecionado.extendedProps.observacoes && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Observações:</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-line">
                      {eventoSelecionado.extendedProps.observacoes}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    navigateToEventDetails(eventoSelecionado.id);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Editar Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Criação Rápida de Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Criar Evento Rápido</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleQuickFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Nome do Evento *</label>
                    <input
                      type="text"
                      name="nome_evento"
                      value={quickFormData.nome_evento}
                      onChange={handleQuickFormChange}
                      placeholder="Ex: Casamento Silva"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Data *</label>
                      <input
                        type="date"
                        name="data"
                        value={quickFormData.data}
                        onChange={handleQuickFormChange}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Horário</label>
                      <input
                        type="time"
                        name="horario"
                        value={quickFormData.horario}
                        onChange={handleQuickFormChange}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Local *</label>
                    <input
                      type="text"
                      name="local"
                      value={quickFormData.local}
                      onChange={handleQuickFormChange}
                      placeholder="Ex: Buffet Estrela"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">DJ Responsável *</label>
                    <select
                      name="dj_id"
                      value={quickFormData.dj_id}
                      onChange={handleQuickFormChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    >
                      <option value="">Selecione um DJ</option>
                      {djs.map(dj => (
                        <option key={dj.id} value={dj.id}>
                          {dj.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Tipo de Evento</label>
                    <input
                      type="text"
                      name="tipo_evento"
                      value={quickFormData.tipo_evento}
                      onChange={handleQuickFormChange}
                      placeholder="Ex: Casamento, Aniversário, Corporativo"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Valor Total (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2">R$</span>
                      <input
                        type="text"
                        name="valor_total"
                        value={quickFormData.valor_total}
                        onChange={handleQuickFormChange}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded px-3 py-2 pl-8"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Criar Evento
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  * Campos obrigatórios. Para mais detalhes, use o formulário completo.
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}
