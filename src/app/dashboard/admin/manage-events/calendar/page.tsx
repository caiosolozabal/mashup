"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { format, parseISO, addDays, isDate } from "date-fns"; 
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
  deleted?: boolean; // Adicionar campo deleted
}

interface EventoCalendario {
  id: string;
  title: string;
  start: string | Date; 
  end?: string | Date;
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

// Função para gerar cores distintas e mapa para armazená-las
const djColorsMap: { [key: string]: { bg: string; border: string } } = {};
const colorPalette = [
  { bg: "#3B82F6", border: "#2563EB" }, // Blue
  { bg: "#10B981", border: "#059669" }, // Green
  { bg: "#F59E0B", border: "#D97706" }, // Amber
  { bg: "#EF4444", border: "#DC2626" }, // Red
  { bg: "#8B5CF6", border: "#7C3AED" }, // Violet
  { bg: "#EC4899", border: "#DB2777" }, // Pink
  { bg: "#6366F1", border: "#4F46E5" }, // Indigo
  { bg: "#14B8A6", border: "#0D9488" }, // Teal
];
let colorAssignIndex = 0;

const assignDjColor = (djId: string): { bg: string; border: string } => {
  if (!djColorsMap[djId]) {
    djColorsMap[djId] = colorPalette[colorAssignIndex % colorPalette.length];
    colorAssignIndex++;
  }
  return djColorsMap[djId];
};

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

  const [quickFormData, setQuickFormData] = useState({
    nome_evento: "",
    data: "",
    local: "",
    horario: "",
    valor_total: "",
    dj_id: "",
    tipo_evento: "",
  });

  // Carregar eventos e DJs e pré-atribuir cores
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // CORREÇÃO: Buscar apenas eventos não deletados
        const eventosQuery = query(
          collection(db, "eventos"), 
          where("deleted", "==", false), // Adiciona filtro para não deletados
          orderBy("data", "asc")
        );
        const eventosSnapshot = await getDocs(eventosQuery);
        const eventosList: Evento[] = [];
        eventosSnapshot.forEach(doc => {
          eventosList.push({ id: doc.id, ...doc.data() as Omit<Evento, "id"> });
        });
        setEventos(eventosList);

        // Buscar DJs
        const djsCollection = collection(db, "users");
        const djsQuery = query(djsCollection, where("role", "==", "dj"));
        const djsSnapshot = await getDocs(djsQuery);
        const djsList: DJ[] = [];
        djsSnapshot.forEach(doc => {
          djsList.push({ id: doc.id, ...doc.data() as Omit<DJ, "id"> });
        });
        setDjs(djsList);

        // Pré-atribuir cores a todos os DJs encontrados
        djsList.forEach(dj => assignDjColor(dj.id));
        console.log("Cores pré-atribuídas aos DJs:", djColorsMap);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do calendário");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Converter eventos para formato do FullCalendar usando cores pré-atribuídas
  useEffect(() => {
    if (djs.length === 0 && eventos.length > 0) {
      console.log("Aguardando carregamento dos DJs para aplicar cores...");
    }

    const convertedEvents = eventos.map(evento => {
      let backgroundColor = "#6B7280"; // Cinza padrão
      let borderColor = "#4B5563";
      let textColor = "#FFFFFF";

      if (evento.dj_id && djColorsMap[evento.dj_id]) {
        const djColor = djColorsMap[evento.dj_id];
        backgroundColor = djColor.bg;
        borderColor = djColor.border;
      } else if (evento.dj_id) {
        console.warn(`Cor não encontrada para DJ ID: ${evento.dj_id}. Usando cor padrão.`);
      }
      
      const eventoCalendario: EventoCalendario = {
        id: evento.id,
        title: `${evento.nome_evento || "Evento sem nome"}${evento.dj_nome ? ` (${evento.dj_nome})` : "."}`,
        start: `${evento.data}${evento.horario ? `T${evento.horario}:00` : ""}`,
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
  }, [eventos, djs]);
  
  const formatarData = (dataInput: string | Date | undefined | null): string => {
    if (!dataInput) return "-";
    try {
      let dataParaFormatar: Date;
      if (isDate(dataInput)) {
        dataParaFormatar = dataInput as Date;
      } else if (typeof dataInput === "string") {
        const dataString = dataInput.includes("T") ? dataInput.split("T")[0] : dataInput;
        dataParaFormatar = parseISO(dataString);
      } else {
        return "Data inválida";
      }
      return format(dataParaFormatar, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error, "Input:", dataInput);
      return typeof dataInput === "string" ? dataInput : "Erro na data";
    }
  };
  
  const getStatusIcon = (status?: string) => {
    if (status === "quitado") return "✅";
    if (status === "parcial") return "⚠️";
    if (status === "pendente") return "🕒";
    if (status === "cancelado") return "🚫";
    return "❓";
  };
  
  const handleEventClick = (info: any) => {
    console.log("Evento clicado (info.event):", info.event);
    console.log("Data de início (info.event.start):", info.event.start, typeof info.event.start);
    setEventoSelecionado(info.event as EventoCalendario);
    setShowModal(true);
  };
  
  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setQuickFormData(prev => ({ ...prev, data: info.dateStr, horario: "19:00" }));
    setShowCreateModal(true);
  };
  
  const goToToday = () => {
    calendarRef.current?.getApi().today();
  };
  
  const changeView = (viewName: string) => {
    calendarRef.current?.getApi().changeView(viewName);
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (numericValue) {
      const floatValue = parseFloat(numericValue) / 100;
      return floatValue.toFixed(2);
    }
    return "";
  };

  const handleQuickFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === "valor_total") {
      formattedValue = formatCurrency(value);
    }
    setQuickFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormData.nome_evento || !quickFormData.data || !quickFormData.local || !quickFormData.dj_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    try {
      const djSelecionado = djs.find(dj => dj.id === quickFormData.dj_id);
      const eventoData = {
        nome_evento: quickFormData.nome_evento.trim(),
        data: quickFormData.data,
        local: quickFormData.local.trim(),
        horario: quickFormData.horario,
        valor_total: quickFormData.valor_total ? parseFloat(quickFormData.valor_total.replace(",", ".")) : 0,
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
        custos: 0,
        status_aprovacao: "pendente",
        deleted: false,
      };
      
      const docRef = await addDoc(collection(db, "eventos"), eventoData);
      toast.success("Evento criado com sucesso!");
      
      const novoEvento: Evento = { id: docRef.id, ...eventoData, data: eventoData.data as string };
      setEventos(prev => [...prev, novoEvento]);
      
      setShowCreateModal(false);
      setQuickFormData({ nome_evento: "", data: "", local: "", horario: "", valor_total: "", dj_id: "", tipo_evento: "" });
      
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      toast.error("Erro ao criar evento");
    }
  };

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
            <Link href="/dashboard/admin/manage-events/create" className="btn-primary">Novo Evento</Link>
            <Link href="/dashboard/admin/manage-events/table" className="btn-secondary">Ver Planilha</Link>
            <Link href="/dashboard/admin" className="btn-secondary">Dashboard</Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <button onClick={goToToday} className="btn-secondary">Hoje</button>
            <button onClick={() => changeView("dayGridMonth")} className="btn-secondary">Mês</button>
            <button onClick={() => changeView("timeGridWeek")} className="btn-secondary">Semana</button>
            <button onClick={() => changeView("timeGridDay")} className="btn-secondary">Dia</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false} 
            events={eventosCalendario}
            locale={ptBR} 
            buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            editable={true}
            droppable={true}
            selectable={true}
            select={handleDateClick}
            height="auto"
            contentHeight="auto"
            aspectRatio={1.8}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
            eventDisplay="block" 
          />
        </div>
      </div>

      {/* Modal Detalhes */}
      {showModal && eventoSelecionado && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">{eventoSelecionado.title}</h3>
            <p><strong>Data:</strong> {formatarData(eventoSelecionado.start)}</p>
            {eventoSelecionado.extendedProps.horario && <p><strong>Horário:</strong> {eventoSelecionado.extendedProps.horario}</p>}
            <p><strong>Local:</strong> {eventoSelecionado.extendedProps.local}</p>
            <p><strong>DJ:</strong> {eventoSelecionado.extendedProps.dj_nome}</p>
            <p><strong>Valor Total:</strong> R$ {eventoSelecionado.extendedProps.valor_total.toFixed(2)}</p>
            <p><strong>Status Pgto:</strong> {getStatusIcon(eventoSelecionado.extendedProps.status_pgto)} {eventoSelecionado.extendedProps.status_pgto}</p>
            {eventoSelecionado.extendedProps.tipo_evento && <p><strong>Tipo:</strong> {eventoSelecionado.extendedProps.tipo_evento}</p>}
            {eventoSelecionado.extendedProps.contratante_nome && <p><strong>Contratante:</strong> {eventoSelecionado.extendedProps.contratante_nome}</p>}
            {eventoSelecionado.extendedProps.observacoes && <p><strong>Obs:</strong> {eventoSelecionado.extendedProps.observacoes}</p>}
            
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => navigateToEventDetails(eventoSelecionado.id)} className="btn-primary">Ver Detalhes Completos</button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criação Rápida */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Criar Evento Rápido ({formatarData(selectedDate)})</h3>
            <form onSubmit={handleQuickFormSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="form-label">Nome do Evento *</label>
                  <input type="text" name="nome_evento" value={quickFormData.nome_evento} onChange={handleQuickFormChange} required className="form-input" />
                </div>
                <div>
                  <label className="form-label">Local *</label>
                  <input type="text" name="local" value={quickFormData.local} onChange={handleQuickFormChange} required className="form-input" />
                </div>
                <div>
                  <label className="form-label">Horário</label>
                  <input type="time" name="horario" value={quickFormData.horario} onChange={handleQuickFormChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Valor Total (R$)</label>
                  <input type="text" name="valor_total" value={quickFormData.valor_total} onChange={handleQuickFormChange} placeholder="1234,56" inputMode="decimal" className="form-input" />
                </div>
                <div>
                  <label className="form-label">DJ *</label>
                  <select name="dj_id" value={quickFormData.dj_id} onChange={handleQuickFormChange} required className="form-input">
                    <option value="">Selecione um DJ</option>
                    {djs.map(dj => (
                      <option key={dj.id} value={dj.id}>{dj.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipo de Evento</label>
                  <input type="text" name="tipo_evento" value={quickFormData.tipo_evento} onChange={handleQuickFormChange} className="form-input" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Criar Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}
