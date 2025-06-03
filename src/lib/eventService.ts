// src/lib/eventService.ts
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, serverTimestamp, addDoc, Timestamp, QueryConstraint } from "firebase/firestore";
import { db } from "./firebaseConfig";
// *** Importar de configService AGORA ***
import { getDefaultAgencyPercentage } from "./configService"; 

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
  percentual_dj?: number; // Ignorado no cálculo financeiro agora
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
  percentual?: number; // Campo antigo, talvez remover?
  percentual_padrao?: number; // Esperado como número após conversão
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

// Função HELPER AJUSTADA para calcular o valor líquido do DJ para UM evento
// Prioriza o percentual padrão do DJ (já esperado como número ou undefined), com fallback para o complemento da agência.
export function calcularValorLiquidoDJEvento(
  evento: Evento,
  djPercentualPadrao?: number, // Espera-se number ou undefined de getAllDJs
  agencyPercentualPadrao: number = 30 // Percentual padrão DA AGÊNCIA (default 30%)
): number {
  // DEBUG Logs
  // console.log(`[DEBUG][calcularValorLiquidoDJEvento] Evento ID: ${evento.id}`);
  // console.log(`[DEBUG][calcularValorLiquidoDJEvento]   Input: djPercentualPadrao=${djPercentualPadrao} (Tipo: ${typeof djPercentualPadrao}), agencyPercentualPadrao=${agencyPercentualPadrao}`);

  if (evento.status_evento === 'cancelado' || evento.deleted === true) {
    // console.log(`[DEBUG][calcularValorLiquidoDJEvento]   Evento cancelado ou deletado. Retornando 0.`);
    return 0;
  }
  const valorTotal = evento.valor_total || 0;
  const custos = evento.custos || 0;

  let percentualDJFinal: number;
  let origem = "N/A";

  // 1. Usa o percentual padrão do DJ se for um número válido
  if (typeof djPercentualPadrao === 'number' && !isNaN(djPercentualPadrao)) {
    percentualDJFinal = djPercentualPadrao;
    origem = "DJ Padrão";
    // console.log(`[DEBUG][calcularValorLiquidoDJEvento]   Usando % Padrão do DJ: ${percentualDJFinal}%`);
  }
  // 2. Fallback: Usa complemento da agência
  else {
    percentualDJFinal = 100 - agencyPercentualPadrao;
    origem = "Fallback (100 - % Agência)";
    // console.log(`[DEBUG][calcularValorLiquidoDJEvento]   DJ sem % padrão válido. Usando Fallback (100 - ${agencyPercentualPadrao}): ${percentualDJFinal}%`);
  }

  // Cálculo: custos + ( (valorTotal - custos) * (%DJ / 100) )
  const valorBaseCalculo = valorTotal - custos;
  const valorPercentualCalculado = valorBaseCalculo * (percentualDJFinal / 100);
  const valorLiquidoEvento = custos + valorPercentualCalculado;

  // console.log(`[DEBUG][calcularValorLiquidoDJEvento]   Cálculo: custos(${custos}) + ( (valorTotal(${valorTotal}) - custos(${custos})) * (${percentualDJFinal} / 100) ) = ${valorLiquidoEvento.toFixed(2)}`);

  return Math.max(0, valorLiquidoEvento); // Garante que não seja negativo
}


// --- Funções Principais de Consulta de Eventos ---

// Função CENTRALIZADA para buscar eventos com base em filtros dinâmicos (mantida e simplificada)
// *** Tornada exportável para ser usada em outros lugares se necessário ***
export async function getFilteredEvents(constraints: QueryConstraint[]): Promise<Evento[]> {
  try {
    const eventosRef = collection(db, "eventos");
    const q = query(eventosRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const eventos: Evento[] = [];
    const djsMap = await getDjsMap();

    querySnapshot.forEach((doc) => {
      const eventoData = doc.data() as Omit<Evento, "id">;
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

// *** ADICIONADO EXPORT *** Função para obter eventos por mês
export async function getEventsByMonth(ano: number, mes: number): Promise<Evento[]> {
  try {
    const eventos: Evento[] = [];

    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);

    // Converte datas para string YYYY-MM-DD para query no Firestore
    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    const fimMesStr = fimMes.toISOString().split('T')[0];

    const constraints: QueryConstraint[] = [
        where("deleted", "==", false),
        where("data", ">=", inicioMesStr),
        where("data", "<=", fimMesStr),
        orderBy("data", "asc")
    ];

    const eventosFiltrados = await getFilteredEvents(constraints);
    
    // Filtra cancelados no código
    return eventosFiltrados.filter(e => e.status_evento !== 'cancelado');

  } catch (error) {
    console.error(`Erro ao carregar eventos para ${mes}/${ano}:`, error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE para getEventsByMonth.");
    }
    return []; // Retorna vazio em caso de erro maior
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
export async function getAllVisibleEvents(): Promise<Evento[]> {
  const queryConstraints: QueryConstraint[] = [
    where("deleted", "==", false),
    orderBy("data", "desc")
  ];
  try {
    const eventos = await getFilteredEvents(queryConstraints);
    return eventos.filter(e => e.status_evento !== 'cancelado');
  } catch (error) {
     console.error("Erro CRÍTICO ao buscar todos eventos visíveis:", error);
     if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE. Verifique índice para: deleted (ASC), data (DESC).");
     }
     throw new Error("Falha ao carregar eventos.");
  }
}

// --- Função para buscar todos os DJs (AJUSTADA para converter percentual) ---
export async function getAllDJs(): Promise<DJ[]> {
  const djs: DJ[] = [];
  try {
    const djsRef = collection(db, "users");
    const djsQuery = query(djsRef, where("role", "==", "dj"), orderBy("nome", "asc"));
    const djsSnapshot = await getDocs(djsQuery);
    djsSnapshot.forEach(doc => {
      const djData = doc.data() as Omit<DJ, "id">;

      // Tenta converter percentual_padrao para número ao carregar, se existir
      let percentualPadraoNumerico: number | undefined = undefined;
      if (djData.percentual_padrao !== undefined && djData.percentual_padrao !== null) {
        const parsedPercent = parseFloat(String(djData.percentual_padrao));
        if (!isNaN(parsedPercent)) {
          percentualPadraoNumerico = parsedPercent;
        } else {
          console.warn(`[eventService/getAllDJs] Percentual padrão inválido ('${djData.percentual_padrao}') para DJ ${doc.id}. Será tratado como não definido.`);
        }
      }

      djs.push({
        id: doc.id,
        nome: djData.nome || djData.email || "DJ sem nome",
        email: djData.email || "",
        role: "dj",
        status: djData.status,
        // Armazena o valor numérico convertido ou undefined
        percentual_padrao: percentualPadraoNumerico,
        // Manter outros campos se existirem...
        agencia: djData.agencia,
        banco: djData.banco,
        conta: djData.conta,
        tipo_conta: djData.tipo_conta,
        cpf: djData.cpf,
      });
    });
    return djs;
  } catch (error) {
    console.error("Erro CRÍTICO ao buscar todos os DJs:", error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[eventService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE para buscar DJs.");
    }
     return []; // Retorna vazio para não quebrar UI
  }
}


// --- Funções de Cálculo Financeiro ---
// AJUSTADA: calculateFinancialSummaryForDJ para usar a nova função de cálculo e buscar % da agência
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
    // Buscar dados necessários em paralelo
    const [eventosFiltrados, djData, agencyPercentage] = await Promise.all([
        getFilteredEvents(constraints),
        getDoc(doc(db, "users", djId)), // Buscar dados do DJ específico
        getDefaultAgencyPercentage() // *** Buscar % da agência do configService ***
    ]);

    let djPercentualPadrao: number | undefined = undefined;
    if (djData.exists()) {
        const djProfile = djData.data();
        if (djProfile.percentual_padrao !== undefined && djProfile.percentual_padrao !== null) {
            const parsed = parseFloat(String(djProfile.percentual_padrao));
            if (!isNaN(parsed)) {
                djPercentualPadrao = parsed;
            }
        }
    }

    const eventosConsiderados = eventosFiltrados.filter(e => e.status_evento !== 'cancelado');

    let somaValorTotalBruto = 0;
    let somaCustos = 0;
    let somaValorLiquidoDJ = 0;

    eventosConsiderados.forEach(evento => {
      // Passa o percentual padrão do DJ e da agência para a função de cálculo
      somaValorLiquidoDJ += calcularValorLiquidoDJEvento(evento, djPercentualPadrao, agencyPercentage);
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

// --- Funções de Modificação de Eventos (inalteradas) ---

// Função para criar um evento
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
    };

    const docRef = await addDoc(collection(db, "eventos"), eventoFinal);

    await addDoc(collection(db, "historico"), {
      tipo: "criacao_direta",
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

// Função para atualizar um evento
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

// Função para excluir um evento (exclusão LÓGICA)
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
export async function getDjEvents(djId: string): Promise<Evento[]> {
  if (!djId) return [];

  const constraints: QueryConstraint[] = [
    where("dj_id", "==", djId),
    where("deleted", "==", false),
    orderBy("data", "asc")
  ];

  try {
    const eventos = await getFilteredEvents(constraints);
    return eventos.filter(e => e.status_evento !== 'cancelado');
  } catch (error) {
    console.error(`Erro ao buscar eventos para o DJ ${djId}:`, error);
    throw new Error("Falha ao carregar agenda do DJ.");
  }
}

