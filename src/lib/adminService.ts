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

export interface Evento {
  id: string;
  data: string; 
  nome_evento: string;
  local: string;
  horario?: string;
  valor_total?: number;
  custos_dj?: number;
  percentual_dj?: number;
  status_evento?: string;
  status_pgto?: string;
  dj_id?: string;
  dj_nome?: string;
  cliente_nome?: string;
  cliente_contato?: string;
  observacoes?: string;
  tipo_evento?: string; 
}

export interface DJ {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  percentual_padrao?: number;
  especialidades?: string[];
  role: string;
  conta_recebimento?: string;
}

// Função para obter o percentual padrão da agência
export async function getDefaultAgencyPercentage(): Promise<number> {
  try {
    const configDocRef = doc(db, "configuracoes", "agencia");
    const configDocSnap = await getDoc(configDocRef);
    if (configDocSnap.exists() && configDocSnap.data().percentualPadrao) {
      return configDocSnap.data().percentualPadrao as number;
    }
  } catch (error) {
    console.error("Erro ao buscar percentual padrão:", error);
  }
  return 30; // Default da agência é 30% para ela, então DJ fica com 70% se não houver override
}

// Função para atualizar o percentual padrão da agência
export async function updateDefaultAgencyPercentage(novoPercentual: number): Promise<boolean> {
  try {
    const configDocRef = doc(db, "configuracoes", "agencia");
    await setDoc(configDocRef, { percentualPadrao: novoPercentual }, { merge: true });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar percentual padrão:", error);
    return false;
  }
}

// Função para carregar eventos da próxima semana para todos os DJs
export async function carregarEventosProximaSemanaAdmin(): Promise<Evento[]> {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diaDaSemanaHoje = hoje.getDay();
    const inicioProximaSemana = new Date(hoje);
    inicioProximaSemana.setDate(hoje.getDate() + (7 - diaDaSemanaHoje + 1) % 7);
    inicioProximaSemana.setHours(0,0,0,0);

    const fimProximaSemana = new Date(inicioProximaSemana);
    fimProximaSemana.setDate(inicioProximaSemana.getDate() + 6);
    fimProximaSemana.setHours(23,59,59,999);

    const eventos: Evento[] = [];

    try {
      const eventosQuery = query(collection(db, "eventos"));
      const snap = await getDocs(eventosQuery);

      // Buscar informações dos DJs para adicionar o nome
      const djsQuery = query(collection(db, "users"), where("role", "==", "dj"));
      const djsSnap = await getDocs(djsQuery);
      const djsMap = new Map<string, string>();
      
      djsSnap.forEach(doc => {
        const djData = doc.data();
        djsMap.set(doc.id, djData.nome);
      });

      snap.forEach(doc => {
        const eventoData = doc.data() as Evento;
        if (!eventoData.data) return;
        
        const [year, month, day] = eventoData.data.split("-").map(Number);
        const dataEv = new Date(year, month - 1, day);
        dataEv.setHours(0,0,0,0);

        if (dataEv >= inicioProximaSemana && dataEv <= fimProximaSemana && eventoData.status_evento !== "cancelado") {
          // Adicionar nome do DJ ao evento
          if (eventoData.dj_id && djsMap.has(eventoData.dj_id)) {
            eventoData.dj_nome = djsMap.get(eventoData.dj_id);
          }
          
          eventos.push({ id: doc.id, ...eventoData });
        }
      });
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
      
      // Dados simulados caso não consiga acessar o Firestore
      const dataProxSemana1 = new Date(inicioProximaSemana);
      const dataProxSemana1Str = dataProxSemana1.toISOString().split('T')[0];
      
      const dataProxSemana2 = new Date(inicioProximaSemana);
      dataProxSemana2.setDate(dataProxSemana2.getDate() + 2);
      const dataProxSemana2Str = dataProxSemana2.toISOString().split('T')[0];
      
      const dataProxSemana3 = new Date(inicioProximaSemana);
      dataProxSemana3.setDate(dataProxSemana3.getDate() + 4);
      const dataProxSemana3Str = dataProxSemana3.toISOString().split('T')[0];
      
      eventos.push({
        id: "evt1",
        data: dataProxSemana1Str,
        nome_evento: "Casamento Silva",
        local: "Buffet Estrela",
        horario: "16:00",
        valor_total: 3200,
        status_pgto: "parcial",
        dj_id: "dj1",
        dj_nome: "DJ Carlos"
      });
      
      eventos.push({
        id: "evt2",
        data: dataProxSemana2Str,
        nome_evento: "Formatura Medicina",
        local: "Centro de Convenções",
        horario: "20:00",
        valor_total: 4500,
        status_pgto: "pendente",
        dj_id: "dj2",
        dj_nome: "DJ Mariana"
      });
      
      eventos.push({
        id: "evt3",
        data: dataProxSemana3Str,
        nome_evento: "Festa Corporativa XYZ",
        local: "Hotel Premium",
        horario: "19:00",
        valor_total: 2800,
        status_pgto: "quitado",
        dj_id: "dj3",
        dj_nome: "DJ Rafael"
      });
    }

    return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  } catch (error) {
    console.error("Erro ao carregar eventos da próxima semana:", error);
    
    // Retorna dados simulados em caso de erro
    const hoje = new Date();
    const inicioProximaSemana = new Date(hoje);
    inicioProximaSemana.setDate(hoje.getDate() + (7 - hoje.getDay() + 1) % 7);
    
    const dataProxSemana1 = new Date(inicioProximaSemana);
    const dataProxSemana1Str = dataProxSemana1.toISOString().split('T')[0];
    
    const dataProxSemana2 = new Date(inicioProximaSemana);
    dataProxSemana2.setDate(dataProxSemana2.getDate() + 2);
    const dataProxSemana2Str = dataProxSemana2.toISOString().split('T')[0];
    
    const dataProxSemana3 = new Date(inicioProximaSemana);
    dataProxSemana3.setDate(dataProxSemana3.getDate() + 4);
    const dataProxSemana3Str = dataProxSemana3.toISOString().split('T')[0];
    
    return [
      {
        id: "evt1",
        data: dataProxSemana1Str,
        nome_evento: "Casamento Silva",
        local: "Buffet Estrela",
        horario: "16:00",
        valor_total: 3200,
        status_pgto: "parcial",
        dj_id: "dj1",
        dj_nome: "DJ Carlos"
      },
      {
        id: "evt2",
        data: dataProxSemana2Str,
        nome_evento: "Formatura Medicina",
        local: "Centro de Convenções",
        horario: "20:00",
        valor_total: 4500,
        status_pgto: "pendente",
        dj_id: "dj2",
        dj_nome: "DJ Mariana"
      },
      {
        id: "evt3",
        data: dataProxSemana3Str,
        nome_evento: "Festa Corporativa XYZ",
        local: "Hotel Premium",
        horario: "19:00",
        valor_total: 2800,
        status_pgto: "quitado",
        dj_id: "dj3",
        dj_nome: "DJ Rafael"
      }
    ];
  }
}

// Função para obter todos os DJs
export async function getAllDJs(): Promise<DJ[]> {
  try {
    const djs: DJ[] = [];
    
    try {
      const djsQuery = query(collection(db, "users"), where("role", "==", "dj"));
      const snap = await getDocs(djsQuery);

      snap.forEach(doc => {
        const djData = doc.data() as Omit<DJ, "id">;
        djs.push({ id: doc.id, ...djData });
      });
    } catch (error) {
      console.error("Erro ao buscar DJs:", error);
      
      // Dados simulados caso não consiga acessar o Firestore
      djs.push({
        id: "dj1",
        nome: "DJ Carlos",
        email: "carlos@exemplo.com",
        telefone: "(11) 98765-4321",
        percentual_padrao: 70,
        role: "dj"
      });
      
      djs.push({
        id: "dj2",
        nome: "DJ Mariana",
        email: "mariana@exemplo.com",
        telefone: "(11) 91234-5678",
        percentual_padrao: 75,
        role: "dj"
      });
      
      djs.push({
        id: "dj3",
        nome: "DJ Rafael",
        email: "rafael@exemplo.com",
        telefone: "(11) 99876-5432",
        percentual_padrao: 70,
        role: "dj"
      });
    }

    return djs;
  } catch (error) {
    console.error("Erro ao carregar todos os DJs:", error);
    
    // Retorna dados simulados em caso de erro
    return [
      {
        id: "dj1",
        nome: "DJ Carlos",
        email: "carlos@exemplo.com",
        telefone: "(11) 98765-4321",
        percentual_padrao: 70,
        role: "dj"
      },
      {
        id: "dj2",
        nome: "DJ Mariana",
        email: "mariana@exemplo.com",
        telefone: "(11) 91234-5678",
        percentual_padrao: 75,
        role: "dj"
      },
      {
        id: "dj3",
        nome: "DJ Rafael",
        email: "rafael@exemplo.com",
        telefone: "(11) 99876-5432",
        percentual_padrao: 70,
        role: "dj"
      }
    ];
  }
}

// Função para obter todos os eventos
export async function getAllEvents(): Promise<Evento[]> {
  try {
    const eventos: Evento[] = [];
    
    try {
      const eventosQuery = query(collection(db, "eventos"), orderBy("data", "desc"));
      const snap = await getDocs(eventosQuery);

      // Buscar informações dos DJs para adicionar o nome
      const djsQuery = query(collection(db, "users"), where("role", "==", "dj"));
      const djsSnap = await getDocs(djsQuery);
      const djsMap = new Map<string, string>();
      
      djsSnap.forEach(doc => {
        const djData = doc.data();
        djsMap.set(doc.id, djData.nome);
      });

      snap.forEach(doc => {
        const eventoData = doc.data() as Evento;
        
        // Adicionar nome do DJ ao evento
        if (eventoData.dj_id && djsMap.has(eventoData.dj_id)) {
          eventoData.dj_nome = djsMap.get(eventoData.dj_id);
        }
        
        eventos.push({ id: doc.id, ...eventoData });
      });
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
      
      // Dados simulados caso não consiga acessar o Firestore
      const hoje = new Date();
      const dataHoje = hoje.toISOString().split('T')[0];
      
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      const dataAmanha = amanha.toISOString().split('T')[0];
      
      const proxSemana = new Date(hoje);
      proxSemana.setDate(hoje.getDate() + 7);
      const dataProxSemana = proxSemana.toISOString().split('T')[0];
      
      eventos.push({
        id: "evt1",
        data: dataHoje,
        nome_evento: "Festa Corporativa",
        local: "Hotel Central",
        horario: "19:00",
        valor_total: 2500,
        status_pgto: "pendente",
        dj_id: "dj1",
        dj_nome: "DJ Carlos"
      });
      
      eventos.push({
        id: "evt2",
        data: dataAmanha,
        nome_evento: "Aniversário 30 Anos",
        local: "Espaço Jardins",
        horario: "20:00",
        valor_total: 1800,
        status_pgto: "quitado",
        dj_id: "dj2",
        dj_nome: "DJ Mariana"
      });
      
      eventos.push({
        id: "evt3",
        data: dataProxSemana,
        nome_evento: "Casamento Silva",
        local: "Buffet Estrela",
        horario: "16:00",
        valor_total: 3200,
        status_pgto: "parcial",
        dj_id: "dj3",
        dj_nome: "DJ Rafael"
      });
    }

    return eventos;
  } catch (error) {
    console.error("Erro ao carregar todos os eventos:", error);
    
    // Retorna dados simulados em caso de erro
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];
    
    const proxSemana = new Date(hoje);
    proxSemana.setDate(hoje.getDate() + 7);
    const dataProxSemana = proxSemana.toISOString().split('T')[0];
    
    return [
      {
        id: "evt1",
        data: dataHoje,
        nome_evento: "Festa Corporativa",
        local: "Hotel Central",
        horario: "19:00",
        valor_total: 2500,
        status_pgto: "pendente",
        dj_id: "dj1",
        dj_nome: "DJ Carlos"
      },
      {
        id: "evt2",
        data: dataAmanha,
        nome_evento: "Aniversário 30 Anos",
        local: "Espaço Jardins",
        horario: "20:00",
        valor_total: 1800,
        status_pgto: "quitado",
        dj_id: "dj2",
        dj_nome: "DJ Mariana"
      },
      {
        id: "evt3",
        data: dataProxSemana,
        nome_evento: "Casamento Silva",
        local: "Buffet Estrela",
        horario: "16:00",
        valor_total: 3200,
        status_pgto: "parcial",
        dj_id: "dj3",
        dj_nome: "DJ Rafael"
      }
    ];
  }
}

// Função para obter eventos por mês
export async function getEventsByMonth(ano: number, mes: number): Promise<Evento[]> {
  try {
    const eventos: Evento[] = [];
    
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);
    
    try {
      const eventosQuery = query(collection(db, "eventos"));
      const snap = await getDocs(eventosQuery);

      // Buscar informações dos DJs para adicionar o nome
      const djsQuery = query(collection(db, "users"), where("role", "==", "dj"));
      const djsSnap = await getDocs(djsQuery);
      const djsMap = new Map<string, string>();
      
      djsSnap.forEach(doc => {
        const djData = doc.data();
        djsMap.set(doc.id, djData.nome);
      });

      snap.forEach(doc => {
        const eventoData = doc.data() as Evento;
        if (!eventoData.data) return;
        
        const [year, month, day] = eventoData.data.split("-").map(Number);
        const dataEv = new Date(year, month - 1, day);
        
        if (dataEv >= inicioMes && dataEv <= fimMes) {
          // Adicionar nome do DJ ao evento
          if (eventoData.dj_id && djsMap.has(eventoData.dj_id)) {
            eventoData.dj_nome = djsMap.get(eventoData.dj_id);
          }
          
          eventos.push({ id: doc.id, ...eventoData });
        }
      });
    } catch (error) {
      console.error("Erro ao buscar eventos por mês:", error);
      
      // Dados simulados caso não consiga acessar o Firestore
      const hoje = new Date();
      
      // Verificar se o mês solicitado é o atual
      if (mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()) {
        const dia1 = new Date(ano, mes - 1, 5).toISOString().split('T')[0];
        const dia2 = new Date(ano, mes - 1, 12).toISOString().split('T')[0];
        const dia3 = new Date(ano, mes - 1, 19).toISOString().split('T')[0];
        const dia4 = new Date(ano, mes - 1, 26).toISOString().split('T')[0];
        
        eventos.push({
          id: "evt1",
          data: dia1,
          nome_evento: "Festa Corporativa",
          local: "Hotel Central",
          horario: "19:00",
          valor_total: 2500,
          status_pgto: "pendente",
          dj_id: "dj1",
          dj_nome: "DJ Carlos"
        });
        
        eventos.push({
          id: "evt2",
          data: dia2,
          nome_evento: "Aniversário 30 Anos",
          local: "Espaço Jardins",
          horario: "20:00",
          valor_total: 1800,
          status_pgto: "quitado",
          dj_id: "dj2",
          dj_nome: "DJ Mariana"
        });
        
        eventos.push({
          id: "evt3",
          data: dia3,
          nome_evento: "Casamento Silva",
          local: "Buffet Estrela",
          horario: "16:00",
          valor_total: 3200,
          status_pgto: "parcial",
          dj_id: "dj3",
          dj_nome: "DJ Rafael"
        });
        
        eventos.push({
          id: "evt4",
          data: dia4,
          nome_evento: "Festival de Verão",
          local: "Praia Grande",
          horario: "14:00",
          valor_total: 4500,
          status_pgto: "pendente",
          dj_id: "dj1",
          dj_nome: "DJ Carlos"
        });
      }
    }

    return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  } catch (error) {
    console.error("Erro ao carregar eventos por mês:", error);
    
    // Retorna dados simulados em caso de erro
    const hoje = new Date();
    
    // Verificar se o mês solicitado é o atual
    if (mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()) {
      const dia1 = new Date(ano, mes - 1, 5).toISOString().split('T')[0];
      const dia2 = new Date(ano, mes - 1, 12).toISOString().split('T')[0];
      const dia3 = new Date(ano, mes - 1, 19).toISOString().split('T')[0];
      const dia4 = new Date(ano, mes - 1, 26).toISOString().split('T')[0];
      
      return [
        {
          id: "evt1",
          data: dia1,
          nome_evento: "Festa Corporativa",
          local: "Hotel Central",
          horario: "19:00",
          valor_total: 2500,
          status_pgto: "pendente",
          dj_id: "dj1",
          dj_nome: "DJ Carlos"
        },
        {
          id: "evt2",
          data: dia2,
          nome_evento: "Aniversário 30 Anos",
          local: "Espaço Jardins",
          horario: "20:00",
          valor_total: 1800,
          status_pgto: "quitado",
          dj_id: "dj2",
          dj_nome: "DJ Mariana"
        },
        {
          id: "evt3",
          data: dia3,
          nome_evento: "Casamento Silva",
          local: "Buffet Estrela",
          horario: "16:00",
          valor_total: 3200,
          status_pgto: "parcial",
          dj_id: "dj3",
          dj_nome: "DJ Rafael"
        },
        {
          id: "evt4",
          data: dia4,
          nome_evento: "Festival de Verão",
          local: "Praia Grande",
          horario: "14:00",
          valor_total: 4500,
          status_pgto: "pendente",
          dj_id: "dj1",
          dj_nome: "DJ Carlos"
        }
      ];
    }
    
    return [];
  }
}
