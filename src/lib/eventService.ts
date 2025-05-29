// src/lib/eventService.ts
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, serverTimestamp, addDoc, Timestamp, QueryConstraint } from "firebase/firestore";
import { db } from "./firebaseConfig";
// import { startOfWeek, endOfWeek, addWeeks, format, startOfMonth, endOfMonth, parseISO } from "date-fns"; // format, etc., not used directly here now

// Interface para Evento (REMOVIDO status_aprovacao e campos relacionados)
export interface Evento {
  id: string;
  nome_evento?: string;
  data: string; // Manter como string 'YYYY-MM-DD'
  local: string;
  horario?: string;
  valor_total?: number;
  sinal_pago?: number;
  custos?: number;
  comprovantes_custos?: string[];
  percentual_dj?: number;
  status_pgto?: string;
  status_evento?: string; // Ex: 'confirmado', 'adiado', 'cancelado'
  dj_id?: string;
  dj_nome?: string;
  contratante_nome?: string;
  contratante_contato?: string;
  observacoes?: string;
  tipo_evento?: string;
  id_interno?: string;
  created_by?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  deleted?: boolean;
  deleted_at?: Timestamp;
  deleted_by?: string;
}

// Interface para DJ (mantida)
export interface DJ {
  id: string;
  nome: string;
  email: string;
  role: string;
  status?: string;
  telefone?: string;
  percentual?: number;
  percentual_padrao?: number;
  agencia?: string;
  banco?: string;
  conta?: string;
  tipo_conta?: string;
  cpf?: string;
}

// Interface para o Resumo Financeiro do DJ (mantida)
export interface ResumoFinanceiroDJ {
  totalEventosConsiderados: number;
  somaValorTotalBruto: number;
  somaCustos: number;
  somaValorLiquidoDJ: number;
}

// --- Funções Auxiliares ---

// Busca nome do DJ (mantida)
async function getDjName(djId: string): Promise<string> {
  try {
    const djRef = doc(db, "users", djId);
    const djSnap = await getDoc(djRef);
    if (djSnap.exists()) {
      return djSnap.data().nome || djSnap.data().email || "DJ não encontrado";
    }
  } catch (err) {
    console.error("Erro ao buscar nome do DJ:", err);
  }
  return "DJ não encontrado";
}

// Mapeia IDs de DJs para Nomes (mantida)
async function getDjsMap(): Promise<Map<string, string>> {
  const djsMap = new Map<string, string>();
  try {
    const djsRef = collection(db, "users");
    const djsQuery = query(djsRef, where("role", "==", "dj"));
    const djsSnapshot = await getDocs(djsQuery);
    djsSnapshot.forEach(doc => {
      const djData = doc.data();
      const nomeDJ = djData.nome || djData.email || "DJ sem nome";
      djsMap.set(doc.id, nomeDJ);
    });
  } catch (error) {
    console.error("Erro ao buscar mapa de DJs:", error);
  }
  return djsMap;
}

// Função HELPER para calcular o valor líquido do DJ para UM evento
// REMOVIDO filtro por status_aprovacao
export function calcularValorLiquidoDJEvento(evento: Evento): number {
  if (evento.status_evento === 'cancelado' || evento.deleted === true) {
    return 0;
  }
  const valorTotal = evento.valor_total || 0;
  const custos = evento.custos || 0;
  const percentualDj = evento.percentual_dj || 70; // Usa 70% como padrão

  const valorBaseCalculo = valorTotal - custos;
  const valorLiquidoEvento = custos + (valorBaseCalculo * (percentualDj / 100));
  return Math.max(0, valorLiquidoEvento);
}

// --- Funções Principais de Consulta de Eventos ---

// Função CENTRALIZADA para buscar eventos com base em filtros dinâmicos (mantida e simplificada)
async function getFilteredEvents(constraints: QueryConstraint[]): Promise<Evento[]> {
  try {
    const eventosRef = collection(db, "eventos");
    const q = query(eventosRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const eventos: Evento[] = [];
    const djsMap = await getDjsMap();

    querySnapshot.forEach((doc) => {
      const eventoData = doc.data() as Omit<Evento, "id">;
      // O filtro deleted e status_evento != 'cancelado' deve ser aplicado na query ou no código chamador
      eventos.push({
        id: doc.id,
        dj_nome: eventoData.dj_id ? djsMap.get(eventoData.dj_id) ?? "DJ não encontrado" : "DJ não atribuído",
        ...eventoData
      });
    });
    return eventos;
  } catch (error) {
    console.error("Erro ao buscar eventos filtrados:", error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE.");
    }
    throw new Error("Falha ao carregar a lista de eventos filtrados.");
  }
}

// Função para buscar um evento específico por ID (não deletado/cancelado)
export async function getEventById(eventoId: string): Promise<Evento | null> {
  try {
    const eventoRef = doc(db, "eventos", eventoId);
    const eventoSnap = await getDoc(eventoRef);

    if (eventoSnap.exists()) {
      const eventoData = eventoSnap.data() as Omit<Evento, "id">;
      if (eventoData.deleted === true || eventoData.status_evento === 'cancelado') {
        return null;
      }
      if (eventoData.dj_id && !eventoData.dj_nome) {
         eventoData.dj_nome = await getDjName(eventoData.dj_id);
      }
      return { id: eventoSnap.id, ...eventoData };
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar evento por ID (${eventoId}):`, error);
    throw new Error(`Falha ao carregar detalhes do evento ${eventoId}.`);
  }
}

// Função para buscar TODOS os eventos visíveis (não deletados/cancelados)
// Renomeada de getAllVisibleEventsForAdmin para getAllVisibleEvents, pois agora não há distinção de aprovação
export async function getAllVisibleEvents(): Promise<Evento[]> {
  const queryConstraints: QueryConstraint[] = [
    where("deleted", "==", false),
    // where("status_evento", "!=", "cancelado"), // Este filtro é melhor aplicado no código após a busca para flexibilidade
    orderBy("data", "desc")
  ];
  try {
    const eventos = await getFilteredEvents(queryConstraints);
    // Filtra cancelados no código, se necessário, ou deixa para o chamador
    return eventos.filter(e => e.status_evento !== 'cancelado');
  } catch (error) {
     console.error("Erro CRÍTICO ao buscar todos eventos visíveis:", error);
     if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE. Verifique índice para: deleted (ASC), data (DESC).");
     }
     throw new Error("Falha ao carregar eventos.");
  }
}

// REMOVIDA: getPendingEventsForAdmin - Não há mais eventos pendentes

// --- Função para buscar todos os DJs (mantida) ---
export async function getAllDJs(): Promise<DJ[]> {
  const djs: DJ[] = [];
  try {
    const djsRef = collection(db, "users");
    const djsQuery = query(djsRef, where("role", "==", "dj"), orderBy("nome", "asc"));
    const djsSnapshot = await getDocs(djsQuery);
    djsSnapshot.forEach(doc => {
      const djData = doc.data();
      djs.push({
        id: doc.id,
        nome: djData.nome || djData.email || "DJ sem nome",
        email: djData.email || "",
        role: "dj",
        status: djData.status,
        percentual_padrao: djData.percentual_padrao
      });
    });
    return djs;
  } catch (error) {
    console.error("Erro CRÍTICO ao buscar todos os DJs:", error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE para buscar DJs.");
    }
    throw new Error("Falha ao carregar a lista de DJs.");
  }
}


// --- Funções de Cálculo Financeiro ---
// AJUSTADA: calculateFinancialSummaryForDJ para não depender de status_aprovacao
export async function calculateFinancialSummaryForDJ(
  djId: string,
  period: { start: string, end: string } // 'YYYY-MM-DD'
): Promise<ResumoFinanceiroDJ> {
  if (!djId) {
    return { totalEventosConsiderados: 0, somaValorTotalBruto: 0, somaCustos: 0, somaValorLiquidoDJ: 0 };
  }

  const constraints: QueryConstraint[] = [
    where("dj_id", "==", djId),
    where("deleted", "==", false),
    where("data", ">=", period.start),
    where("data", "<=", period.end),
    orderBy("data", "asc")
  ];

  try {
    const eventosFiltrados = await getFilteredEvents(constraints);
    // Eventos considerados são aqueles não cancelados
    const eventosConsiderados = eventosFiltrados.filter(e => e.status_evento !== 'cancelado');

    let somaValorTotalBruto = 0;
    let somaCustos = 0;
    let somaValorLiquidoDJ = 0;

    eventosConsiderados.forEach(evento => {
      somaValorLiquidoDJ += calcularValorLiquidoDJEvento(evento);
      somaValorTotalBruto += evento.valor_total || 0;
      somaCustos += evento.custos || 0;
    });

    return {
      totalEventosConsiderados: eventosConsiderados.length,
      somaValorTotalBruto: somaValorTotalBruto,
      somaCustos: somaCustos,
      somaValorLiquidoDJ: somaValorLiquidoDJ
    };
  } catch (error) {
    console.error(`Erro ao calcular resumo financeiro para DJ ${djId}:`, error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE para Resumo Financeiro DJ.");
    }
    return { totalEventosConsiderados: 0, somaValorTotalBruto: 0, somaCustos: 0, somaValorLiquidoDJ: 0 };
  }
}

// --- Funções de Modificação de Eventos ---

// Função para criar um evento
// REMOVIDO parâmetro isAdmin e lógica de status_aprovacao. Evento é criado como ativo.
export async function createEvent(
  eventoData: Omit<Evento, "id" | "created_at" | "updated_at" | "deleted" | "deleted_at" | "deleted_by" | "dj_nome">,
  usuarioId: string
): Promise<string> {
  if (!usuarioId) throw new Error("ID do usuário é obrigatório para criar um evento");

  try {
    const { dj_nome, ...dataToSave } = eventoData;
    let djNameToSave = dj_nome;

    if (dataToSave.dj_id) {
      djNameToSave = await getDjName(dataToSave.dj_id);
    }

    const eventoFinal: Omit<Evento, "id"> = {
      ...dataToSave,
      dj_nome: djNameToSave,
      created_by: usuarioId,
      created_at: serverTimestamp() as Timestamp,
      updated_at: serverTimestamp() as Timestamp,
      deleted: false,
      status_evento: dataToSave.status_evento || "confirmado" // Default "confirmado"
      // REMOVIDO: status_aprovacao, approved_by, approved_at
    };

    const docRef = await addDoc(collection(db, "eventos"), eventoFinal);

    await addDoc(collection(db, "historico"), {
      tipo: "criacao_direta", // Alterado tipo para refletir ausência de aprovação
      entidade: "evento",
      entidade_id: docRef.id,
      usuario_id: usuarioId,
      timestamp: serverTimestamp(),
      detalhes: { nome_evento: dataToSave.nome_evento, dj_id: dataToSave.dj_id }
    });

    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw new Error("Falha ao criar o evento. Verifique os dados e tente novamente.");
  }
}

// Função para atualizar um evento (mantida, mas campos de aprovação não são mais relevantes aqui)
export async function updateEvent(eventoId: string, eventoData: Partial<Omit<Evento, "id" | "created_at" | "created_by" | "dj_nome">>, usuarioId: string): Promise<void> {
  if (!usuarioId) throw new Error("ID do usuário é obrigatório para atualizar um evento");
  if (!eventoId) throw new Error("ID do evento é obrigatório para atualizar");

  try {
    const eventoRef = doc(db, "eventos", eventoId);
    const eventoSnap = await getDoc(eventoRef);

    if (!eventoSnap.exists() || eventoSnap.data().deleted === true) {
      throw new Error("Evento não encontrado ou já foi excluído.");
    }

    const eventoAnterior = eventoSnap.data();
    const { dj_nome, ...dataToUpdate } = eventoData;
    let djNameToUpdate = eventoAnterior.dj_nome;

    if (dataToUpdate.dj_id && dataToUpdate.dj_id !== eventoAnterior.dj_id) {
      djNameToUpdate = await getDjName(dataToUpdate.dj_id);
    }
    else if (dataToUpdate.hasOwnProperty('dj_id') && !dataToUpdate.dj_id) {
        djNameToUpdate = ""; // Nome vazio se DJ é removido
    }

    await updateDoc(eventoRef, {
      ...dataToUpdate,
      dj_nome: djNameToUpdate,
      updated_at: serverTimestamp()
    });

    await addDoc(collection(db, "historico"), {
      tipo: "edicao",
      entidade: "evento",
      entidade_id: eventoId,
      usuario_id: usuarioId,
      timestamp: serverTimestamp(),
      detalhes: { nome_evento: dataToUpdate.nome_evento || eventoAnterior.nome_evento, campos_alterados: Object.keys(dataToUpdate) }
    });
  } catch (error) {
    console.error(`Erro ao atualizar evento (${eventoId}):`, error);
    throw new Error(`Falha ao atualizar o evento. Verifique os dados e tente novamente.`);
  }
}

// REMOVIDA: approveEvent
// REMOVIDA: rejectEvent

// Função para excluir um evento (exclusão LÓGICA - mantida)
export async function deleteEvent(eventoId: string, usuarioId: string): Promise<void> {
  if (!usuarioId) throw new Error("ID do usuário é obrigatório para excluir um evento");
  if (!eventoId) throw new Error("ID do evento é obrigatório para excluir");

  try {
    const eventoRef = doc(db, "eventos", eventoId);
    const eventoSnap = await getDoc(eventoRef);

    if (!eventoSnap.exists() || eventoSnap.data().deleted === true) {
      return; // Não faz nada se já excluído ou não existe
    }
    const eventoData = eventoSnap.data();

    await updateDoc(eventoRef, {
      deleted: true,
      deleted_at: serverTimestamp(),
      deleted_by: usuarioId,
      updated_at: serverTimestamp()
    });

    await addDoc(collection(db, "historico"), {
      tipo: "exclusao_logica",
      entidade: "evento",
      entidade_id: eventoId,
      usuario_id: usuarioId,
      timestamp: serverTimestamp(),
      detalhes: { nome_evento: eventoData.nome_evento, dj_id: eventoData.dj_id }
    });
  } catch (error) {
    console.error(`Erro ao excluir evento (${eventoId}):`, error);
    throw new Error(`Falha ao excluir o evento ${eventoId}.`);
  }
}

// Função para buscar eventos de um DJ específico (para agenda do DJ)
// Não precisa mais filtrar por status_aprovacao, apenas por deleted e status_evento
export async function getDjEvents(djId: string): Promise<Evento[]> {
  if (!djId) return [];

  const constraints: QueryConstraint[] = [
    where("dj_id", "==", djId),
    where("deleted", "==", false),
    // where("status_evento", "!=", "cancelado"), // Opcional, pode ser filtrado no frontend
    orderBy("data", "asc")
  ];

  try {
    const eventos = await getFilteredEvents(constraints);
    return eventos.filter(e => e.status_evento !== 'cancelado'); // Filtra cancelados aqui para consistência
  } catch (error) {
    console.error(`Erro ao buscar eventos para o DJ ${djId}:`, error);
    throw new Error("Falha ao carregar agenda do DJ.");
  }
}

