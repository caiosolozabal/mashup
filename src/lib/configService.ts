// src/lib/configService.ts
import { db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Função para obter o percentual padrão da agência
export async function getDefaultAgencyPercentage(): Promise<number> {
  try {
    const configDocRef = doc(db, "configuracoes", "agencia");
    const configDocSnap = await getDoc(configDocRef);
    if (configDocSnap.exists() && configDocSnap.data().percentualPadrao) {
      const percentual = parseFloat(configDocSnap.data().percentualPadrao);
      if (!isNaN(percentual)) {
        console.log(`[configService] Percentual padrão da agência carregado: ${percentual}%`);
        return percentual;
      }
    }
  } catch (error) {
    console.error("[configService] Erro ao buscar percentual padrão da agência:", error);
  }
  console.log("[configService] Usando percentual padrão da agência default: 30%");
  return 30; // Default da agência é 30%
}

// Função para atualizar o percentual padrão da agência
export async function updateDefaultAgencyPercentage(novoPercentual: number): Promise<boolean> {
  try {
    const configDocRef = doc(db, "configuracoes", "agencia");
    await setDoc(configDocRef, { percentualPadrao: novoPercentual }, { merge: true });
    console.log(`[configService] Percentual padrão da agência atualizado para: ${novoPercentual}%`);
    return true;
  } catch (error) {
    console.error("[configService] Erro ao atualizar percentual padrão da agência:", error);
    return false;
  }
}

