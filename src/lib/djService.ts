// src/lib/djService.ts
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, orderBy, getDocs, Timestamp, QueryConstraint } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";

// Interface para Evento (precisa estar aqui ou importada)
export interface Evento {
  id: string;
  nome_evento?: string;
  data: string; // Manter como string 'YYYY-MM-DD'
  local: string;
  horario?: string;
  valor_total?: number;
  sinal_pago?: number;
  custos?: number;
  custos_dj?: number; // Adicionado para compatibilidade
  comprovantes_custos?: string[];
  percentual_dj?: number;
  status_pgto?: string;
  status_evento?: string; // Ex: 'confirmado', 'adiado', 'cancelado'
  status_aprovacao?: "aprovado" | "pendente" | "rejeitado";
  dj_id?: string;
  dj_nome?: string; // Será preenchido buscando pelo dj_id na coleção users
  contratante_nome?: string;
  contratante_contato?: string;
  observacoes?: string;
  tipo_evento?: string;
  id_interno?: string;
  created_by?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  motivo_rejeicao?: string;
  deleted?: boolean;
  deleted_at?: Timestamp;
  deleted_by?: string;
  approved_by?: string;
  approved_at?: Timestamp;
  rejected_by?: string;
  rejected_at?: Timestamp;
}

// Interface para DJ (usando a estrutura unificada da coleção users)
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

// Interface para o Resumo Financeiro do DJ
export interface ResumoFinanceiroDJ {
  totalEventos: number;
  somaValorTotalBruto: number;
  somaCustos: number;
  somaValorLiquidoDJ: number;
}

// --- Funções Específicas do DJ ---

// Função para buscar um DJ específico por ID (da coleção users)
export async function getDjById(djId: string): Promise<DJ | null> {
  if (!djId) {
    console.warn("[djService] Tentativa de buscar DJ sem ID.");
    return null;
  }
  try {
    const djRef = doc(db, "users", djId);
    const djSnap = await getDoc(djRef);

    if (djSnap.exists() && djSnap.data().role === "dj") {
      const djData = djSnap.data();
      return {
        id: djSnap.id,
        nome: djData.nome || djData.email || "DJ sem nome",
        email: djData.email || "",
        role: djData.role || "dj",
        status: djData.status,
        telefone: djData.telefone,
        percentual: djData.percentual,
        percentual_padrao: djData.percentual_padrao,
        agencia: djData.agencia,
        banco: djData.banco,
        conta: djData.conta,
        tipo_conta: djData.tipo_conta,
        cpf: djData.cpf
      };
    }
    console.log(`[djService] DJ com ID ${djId} não encontrado ou não tem role 'dj'.`);
    return null;
  } catch (error) {
    console.error(`[djService] Erro ao buscar DJ por ID (${djId}):`, error);
    return null;
  }
}

// Função para atualizar informações de conta do DJ (na coleção users)
export async function updateDjAccountInfo(djId: string, dadosDj: Partial<Omit<DJ, 'id' | 'role' | 'email'>>): Promise<void> {
  if (!djId) throw new Error("[djService] ID do DJ é obrigatório para atualizar informações.");
  if (Object.keys(dadosDj).length === 0) {
    console.warn("[djService] Tentativa de atualizar DJ sem dados.");
    return;
  }

  try {
    const userRef = doc(db, "users", djId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().role !== 'dj') {
        throw new Error(`[djService] DJ com ID ${djId} não encontrado ou não é um DJ.`);
    }

    await updateDoc(userRef, {
      ...dadosDj,
      updated_at: serverTimestamp()
    });

    await addDoc(collection(db, "historico"), {
      tipo: "edicao_perfil_dj",
      entidade: "user",
      entidade_id: djId,
      usuario_id: djId,
      timestamp: serverTimestamp(),
      detalhes: { campos_alterados: Object.keys(dadosDj) }
    });

  } catch (error) {
    console.error(`[djService] Erro ao atualizar informações do DJ (${djId}):`, error);
    throw new Error(`[djService] Falha ao atualizar informações do DJ ${djId}.`);
  }
}

// Função para buscar eventos visíveis para o DJ (Agenda/Dashboard)
// CORRIGIDO: Removido filtro de status_aprovacao para exibir todos os eventos do DJ
export async function getVisibleDjEvents(djId: string): Promise<Evento[]> {
  console.log(`[DEBUG] Iniciando getVisibleDjEvents para DJ ID: ${djId}`);
  if (!djId) {
    console.error("[djService] DJ ID não fornecido para getVisibleDjEvents");
    return [];
  }

  try {
    const eventosRef = collection(db, "eventos");
    const constraints: QueryConstraint[] = [
      where("dj_id", "==", djId),
      // REMOVIDO: Filtro de status_aprovacao para permitir que eventos sem esse campo apareçam
      // where("status_aprovacao", "in", ["aprovado", "pendente"]),
      where("deleted", "==", false),
      orderBy("data", "asc")
    ];

    console.log("[DEBUG] Query Constraints (deleted == false):", constraints);

    const q = query(eventosRef, ...constraints);

    console.log("[DEBUG] Executando query ao Firestore...");
    const querySnapshot = await getDocs(q);
    console.log(`[DEBUG] Query executada. Snapshot size: ${querySnapshot.size}, isEmpty: ${querySnapshot.empty}`);

    const eventos: Evento[] = [];

    // Busca o nome do DJ uma única vez para adicionar aos eventos
    let djNome = "DJ";
    try {
      const djInfo = await getDjById(djId);
      if (djInfo) {
        djNome = djInfo.nome;
      }
      console.log(`[DEBUG] Nome do DJ buscado: ${djNome}`);
    } catch (err) {
      console.error("[djService] Erro ao buscar nome do DJ para eventos visíveis:", err);
    }

    console.log("[DEBUG] Iterando sobre os documentos do snapshot...");
    querySnapshot.forEach((doc) => {
      const eventoData = doc.data() as Omit<Evento, "id">;
      console.log(`[DEBUG] Documento ID: ${doc.id}, Dados Brutos:`, JSON.stringify(eventoData));

      // Filtro adicional em código para cancelados
      if (eventoData.status_evento !== 'cancelado') {
          console.log(`[DEBUG] Evento ${doc.id} NÃO está cancelado. Adicionando à lista.`);
          eventos.push({
            id: doc.id,
            ...eventoData,
            dj_nome: djNome // Adiciona o nome do DJ recuperado
          });
      } else {
          console.log(`[DEBUG] Evento ${doc.id} está cancelado. Ignorando.`);
      }
    });

    console.log(`[DEBUG] Final getVisibleDjEvents. Eventos visíveis encontrados para DJ ${djId} (${djNome}): ${eventos.length}`);
    console.log("[DEBUG] Eventos retornados:", JSON.stringify(eventos));
    return eventos;

  } catch (error) {
    console.error(`[djService] Erro CRÍTICO ao buscar eventos visíveis do DJ (${djId}):`, error);
    // Verifica se o erro é sobre índice ausente
    if (error instanceof Error && error.message.includes("index")) {
        console.error("[djService] POSSÍVEL PROBLEMA DE ÍNDICE NO FIRESTORE. Verifique se existe um índice composto para: dj_id (ASC), deleted (ASC), data (ASC) na coleção 'eventos'.");
    }
    console.log("[DEBUG] Retornando array vazio devido a erro.");
    // Retorna array vazio em caso de erro para não quebrar a UI
    return [];
    // throw new Error(`Falha ao carregar seus eventos visíveis.`);
  }
}

// Função para carregar eventos da semana atual e próxima para o DJ (Dashboard)
// Revertida para djService.ts
export async function getWeeklyEventsForDJ(djId: string): Promise<{semanaAtual: Evento[], proximaSemana: Evento[]}> {
  const hoje = new Date();
  const inicioSemanaAtual = startOfWeek(hoje, { weekStartsOn: 0 });
  const fimSemanaAtual = endOfWeek(hoje, { weekStartsOn: 0 });
  const inicioProximaSemana = addWeeks(inicioSemanaAtual, 1);
  const fimProximaSemana = addWeeks(fimSemanaAtual, 1);

  const formatToQuery = (date: Date) => format(date, "yyyy-MM-dd");

  try {
    // Chama a função getVisibleDjEvents que já contém os filtros corretos
    const todosEventosVisiveis = await getVisibleDjEvents(djId);

    // Filtra os eventos por período no lado do cliente
    const eventosSemanaAtual = todosEventosVisiveis.filter(evento =>
      evento.data >= formatToQuery(inicioSemanaAtual) && evento.data <= formatToQuery(fimSemanaAtual)
    );
    const eventosProximaSemana = todosEventosVisiveis.filter(evento =>
      evento.data >= formatToQuery(inicioProximaSemana) && evento.data <= formatToQuery(fimProximaSemana)
    );

    return {
      semanaAtual: eventosSemanaAtual,
      proximaSemana: eventosProximaSemana
    };
  } catch (error) {
    console.error("[djService] Erro ao carregar eventos das semanas para DJ:", error);
    // Retorna vazio em caso de erro
    return { semanaAtual: [], proximaSemana: [] };
    // throw new Error("Falha ao carregar eventos das semanas");
  }
}

// Função HELPER para calcular o valor líquido do DJ para UM evento
export function calcularValorLiquidoDJEvento(evento: Evento): number {
  if (evento.status_evento === 'cancelado' || evento.deleted === true) {
    return 0;
  }
  const valorTotal = evento.valor_total || 0;
  const custos = evento.custos || evento.custos_dj || 0; // Compatibilidade com ambos os campos
  const percentualDj = evento.percentual_dj || 70; // Usa 70% como padrão

  const valorBaseCalculo = valorTotal - custos;
  const valorLiquidoEvento = custos + (valorBaseCalculo * (percentualDj / 100));
  return Math.max(0, valorLiquidoEvento);
}

// Função para calcular o resumo financeiro do DJ para um período
export async function calcularResumoFinanceiroDJ(
  djId: string,
  periodo?: { inicio: string, fim: string } // Opcional: 'YYYY-MM-DD'
): Promise<ResumoFinanceiroDJ> {
  if (!djId) {
    return { totalEventos: 0, somaValorTotalBruto: 0, somaCustos: 0, somaValorLiquidoDJ: 0 };
  }

  try {
    // Buscar todos os eventos visíveis do DJ
    const todosEventos = await getVisibleDjEvents(djId);
    
    // Se período não for fornecido, usa o mês atual
    let eventosConsiderados = todosEventos;
    
    if (periodo) {
      // Filtra por período específico
      eventosConsiderados = todosEventos.filter(evento => 
        evento.data >= periodo.inicio && evento.data <= periodo.fim
      );
    } else {
      // Filtra para o mês atual
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1; // 1-12
      
      eventosConsiderados = todosEventos.filter(evento => {
        if (!evento.data) return false;
        const [ano, mes] = evento.data.split('-').map(Number);
        return ano === anoAtual && mes === mesAtual;
      });
    }

    // Calcula os valores do resumo
    let somaValorTotalBruto = 0;
    let somaCustos = 0;
    let somaValorLiquidoDJ = 0;

    eventosConsiderados.forEach(evento => {
      somaValorTotalBruto += evento.valor_total || 0;
      somaCustos += evento.custos || evento.custos_dj || 0; // Compatibilidade com ambos os campos
      somaValorLiquidoDJ += calcularValorLiquidoDJEvento(evento);
    });

    return {
      totalEventos: eventosConsiderados.length,
      somaValorTotalBruto,
      somaCustos,
      somaValorLiquidoDJ
    };
  } catch (error) {
    console.error(`[djService] Erro ao calcular resumo financeiro para DJ ${djId}:`, error);
    return { totalEventos: 0, somaValorTotalBruto: 0, somaCustos: 0, somaValorLiquidoDJ: 0 };
  }
}
