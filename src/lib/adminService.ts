// src/lib/adminService.ts
import { db } from "./firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  orderBy,
  setDoc,
} from "firebase/firestore";
// Importar funções unificadas de eventService
import { getAllDJs as getAllDJsFromEventService, getEventsByMonth } from "./eventService"; 
// Importar funções de configuração do novo configService
import { getDefaultAgencyPercentage } from "./configService";

// Reutilizar interfaces de eventService
import type { Evento, DJ } from "./eventService";

// Interface para o resumo financeiro detalhado por DJ (específica do admin dashboard)
export interface ResumoFinanceiroDJ {
  djId: string;
  djNome: string;
  valorBruto: number; // Valor total dos eventos do DJ no mês
  valorLiquidoDJ: number; // Valor que o DJ efetivamente recebe
  valorAgencia: number; // Valor que a agência recebe dos eventos desse DJ
  eventosConsiderados: number; // Quantidade de eventos considerados para este DJ
}

// Interface para o resumo financeiro mensal completo da agência (específica do admin dashboard)
export interface ResumoFinanceiroMensalAgencia {
  totalBrutoGeral: number; // Soma do valor_total de todos os eventos considerados no mês
  totalAgenciaGeral: number; // Soma do valor recebido pela agência de todos os eventos
  totalLiquidoDJs: number; // Soma do valor líquido recebido por todos os DJs
  totalEventosGeral: number; // Número total de eventos considerados no cálculo
  resumoPorDJ: ResumoFinanceiroDJ[]; // Array com o resumo detalhado de cada DJ
}


// REMOVIDAS: Funções getDefaultAgencyPercentage e updateDefaultAgencyPercentage movidas para configService.ts

// REMOVIDAS: Funções duplicadas que agora são importadas de eventService
// - getAllDJs (usar getAllDJsFromEventService)
// - getEventsByMonth (já importada)

// Função AJUSTADA para calcular o resumo financeiro MENSAL COMPLETO
// USA AGORA getAllDJs e getEventsByMonth de eventService e getDefaultAgencyPercentage de configService
export async function calculateMonthlyRevenueSummaryForAllDJs(ano: number, mes: number): Promise<ResumoFinanceiroMensalAgencia | null> {
  try {
    console.log(`
--- [DEBUG][adminService] Iniciando cálculo financeiro para ${mes}/${ano} ---`);

    // 1. Buscar dados necessários usando funções unificadas/centralizadas
    const [eventosDoMes, todosDJs, percentualAgenciaPadrao] = await Promise.all([
      getEventsByMonth(ano, mes), // Importada de eventService
      getAllDJsFromEventService(), // Importada de eventService como alias
      getDefaultAgencyPercentage() // Importada de configService
    ]);

    console.log(`[DEBUG][adminService] Dados carregados: ${eventosDoMes.length} eventos, ${todosDJs.length} DJs, % Agência Padrão: ${percentualAgenciaPadrao}`);

    if (eventosDoMes.length === 0) {
      console.log("[DEBUG][adminService] Nenhum evento encontrado. Retornando resumo vazio.");
      return {
        totalBrutoGeral: 0, totalAgenciaGeral: 0, totalLiquidoDJs: 0, totalEventosGeral: 0, resumoPorDJ: []
      };
    }
     if (todosDJs.length === 0) {
      console.log("[DEBUG][adminService] Nenhum DJ encontrado. Retornando resumo vazio.");
       return {
        totalBrutoGeral: 0, totalAgenciaGeral: 0, totalLiquidoDJs: 0, totalEventosGeral: 0, resumoPorDJ: []
      };
    }

    // A função getAllDJsFromEventService já retorna DJs com percentual_padrao numérico ou undefined
    const djsMap = new Map<string, DJ>(todosDJs.map(dj => [dj.id, dj]));

    // 2. Calcular faturamento e totais
    const resumoPorDJMap = new Map<string, ResumoFinanceiroDJ>();
    let totalBrutoGeral = 0;
    let totalAgenciaGeral = 0;
    let totalLiquidoDJs = 0;
    let totalEventosGeral = 0;

    console.log(`
--- [DEBUG][adminService] Processando ${eventosDoMes.length} eventos ---`);
    for (const evento of eventosDoMes) {
      console.log(`
[DEBUG][adminService] Evento ID: ${evento.id}, Nome: ${evento.nome_evento}, Valor: ${evento.valor_total}, DJ ID: ${evento.dj_id}`);

      if (evento.dj_id && evento.valor_total && evento.valor_total > 0 && evento.status_evento !== 'cancelado' && !evento.deleted) {
        const dj = djsMap.get(evento.dj_id);
        if (!dj) {
          console.warn(`[DEBUG][adminService] DJ ID ${evento.dj_id} não encontrado no Map. Pulando evento ${evento.id}.`);
          continue;
        }

        console.log(`[DEBUG][adminService]   DJ: ${dj.nome}, % Padrão (do objeto DJ): ${dj.percentual_padrao} (Tipo: ${typeof dj.percentual_padrao})`);

        totalEventosGeral++;
        totalBrutoGeral += evento.valor_total;

        // --- LÓGICA DE PERCENTUAL (igual à de eventService) --- 
        let percentualDJFinal: number;
        let origemPercentual = "N/A";
        
        // Prioridade 1: Usa o percentual padrão do DJ (já deve ser número)
        if (typeof dj.percentual_padrao === 'number' && !isNaN(dj.percentual_padrao)) {
            percentualDJFinal = dj.percentual_padrao;
            origemPercentual = "DJ Padrão";
            console.log(`[DEBUG][adminService]     Usando % Padrão DJ: ${percentualDJFinal}%`);
        } 
        // Prioridade 2 (Fallback): Usa complemento da agência
        else {
            percentualDJFinal = 100 - percentualAgenciaPadrao;
            origemPercentual = "Fallback (100 - % Agência)";
            console.log(`[DEBUG][adminService]     DJ sem % padrão. Usando Fallback (100 - ${percentualAgenciaPadrao}): ${percentualDJFinal}%`);
        }
        // --- FIM DA LÓGICA DE PERCENTUAL --- 

        // Cálculo Financeiro (Considerando custos se houver)
        const custosEvento = evento.custos || 0;
        const valorBaseCalculo = evento.valor_total - custosEvento;
        const valorLiquidoDJEvento = custosEvento + (valorBaseCalculo * (percentualDJFinal / 100));
        const valorAgenciaEvento = evento.valor_total - valorLiquidoDJEvento; // O restante fica para a agência

        console.log(`[DEBUG][adminService]     Cálculo: Custo(${custosEvento}) + (Base(${valorBaseCalculo}) * ${percentualDJFinal}%) = Líquido DJ ${valorLiquidoDJEvento.toFixed(2)}`);
        console.log(`[DEBUG][adminService]     Valor Agência Evento: ${valorAgenciaEvento.toFixed(2)}`);

        totalLiquidoDJs += valorLiquidoDJEvento;
        totalAgenciaGeral += valorAgenciaEvento;

        // Acumular no resumo do DJ
        let resumoDJ = resumoPorDJMap.get(dj.id);
        if (!resumoDJ) {
          resumoDJ = {
            djId: dj.id,
            djNome: dj.nome,
            valorBruto: 0,
            valorLiquidoDJ: 0,
            valorAgencia: 0,
            eventosConsiderados: 0
          };
        }
        resumoDJ.valorBruto += evento.valor_total; // Valor bruto do evento
        resumoDJ.valorLiquidoDJ += valorLiquidoDJEvento; // Valor líquido do DJ
        resumoDJ.valorAgencia += valorAgenciaEvento; // Valor da agência
        resumoDJ.eventosConsiderados++;
        resumoPorDJMap.set(dj.id, resumoDJ);
        console.log(`[DEBUG][adminService]   Resumo acumulado DJ ${dj.nome}: Bruto=${resumoDJ.valorBruto.toFixed(2)}, Líquido=${resumoDJ.valorLiquidoDJ.toFixed(2)}, Agência=${resumoDJ.valorAgencia.toFixed(2)}, Eventos=${resumoDJ.eventosConsiderados}`);

      } else {
         console.log(`[DEBUG][adminService] Evento ID: ${evento.id} pulado (sem DJ, valor<=0, cancelado ou deletado).`);
      }
    }
    console.log(`
--- [DEBUG][adminService] Fim do processamento de eventos ---`);

    // 3. Formatar a saída final
    const resultadoFinal: ResumoFinanceiroMensalAgencia = {
      totalBrutoGeral: parseFloat(totalBrutoGeral.toFixed(2)),
      totalAgenciaGeral: parseFloat(totalAgenciaGeral.toFixed(2)),
      totalLiquidoDJs: parseFloat(totalLiquidoDJs.toFixed(2)),
      totalEventosGeral: totalEventosGeral,
      resumoPorDJ: Array.from(resumoPorDJMap.values()).map(resumo => ({
        ...resumo,
        valorBruto: parseFloat(resumo.valorBruto.toFixed(2)),
        valorLiquidoDJ: parseFloat(resumo.valorLiquidoDJ.toFixed(2)),
        valorAgencia: parseFloat(resumo.valorAgencia.toFixed(2)),
      }))
    };

    console.log(`
--- [DEBUG][adminService] Resumo financeiro final calculado ---`);
    // console.log(JSON.stringify(resultadoFinal, null, 2)); // Log detalhado opcional
    console.log(`--- [DEBUG][adminService] Fim da função calculateMonthlyRevenueSummaryForAllDJs ---`);

    return resultadoFinal;

  } catch (error) {
    console.error("[DEBUG][adminService] Erro crítico durante cálculo financeiro:", error);
    // Logar o erro específico que pode estar vindo das funções importadas
    if (error instanceof Error) {
        console.error("[DEBUG][adminService] Detalhes do erro:", error.message, error.stack);
    }
    return null;
  }
}

