
import type { UserRole } from '@/context/AuthContext';

// UserDetails structure, to be refined
export interface UserDetails {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  percentage: number; // DJ's individual commission percentage (e.g., 70 for 70%)
  // other app-specific user fields
}

export interface EventFile {
  id: string; // Can be file name or a generated ID
  name: string;
  url: string; // Firebase Storage URL
  type: 'contract' | 'payment_proof_client' | 'dj_receipt' | 'other';
  uploadedAt: Date; // Consider storing as Timestamp or ISO string in Firestore
}

export interface Event {
  id: string;
  data_evento: Date; // Stored as Firestore Timestamp, converted to Date on client
  dia_da_semana: string;
  nome_evento: string;
  local: string;
  contratante_nome: string;
  contratante_contato?: string | null;
  valor_total: number;
  valor_sinal: number;
  conta_que_recebeu: 'agencia' | 'dj';
  status_pagamento: 'pendente' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
  dj_id: string;
  dj_nome: string;
  dj_costs?: number | null; // Custos adicionais do DJ para este evento
  payment_proofs?: EventFile[] | null; // Comprovantes de pagamento enviados pelo DJ
  created_by: string; // UID of user who created event
  created_at: Date; // Stored as Firestore Timestamp
  updated_at?: Date; // Stored as Firestore Timestamp
  files?: EventFile[] | null; // Outros arquivos gerais do evento
}

// Represents a financial transaction, could be part of a settlement or a standalone payment
export interface FinancialTransaction {
  id:string;
  eventId?: string; // Optional, if transaction is linked to a specific event
  settlementId?: string; // Optional, if part of a settlement
  djId: string;
  amount: number; // Positive for payments to DJ/Agency, can be negative for clawbacks if needed
  currency: string; // e.g., "BRL"
  type:
    | 'dj_commission_payout' // Agency pays DJ their cut
    | 'agency_fee_collection' // Agency collects its cut from DJ
    | 'client_payment_to_dj' // Record of client paying DJ directly
    | 'client_payment_to_agency' // Record of client paying agency
    | 'expense_reimbursement'; // Other types as needed
  description: string;
  transactionDate: Date;
  proofUrl?: string; // Link to Firebase Storage for payment slip
  createdBy: string; // UID of user who recorded this transaction
  createdAt: Date;
}


// Represents a periodic financial closing for a DJ
export interface FinancialSettlement {
  id: string;
  djId: string;
  periodStart: Date;
  periodEnd: Date;
  eventsCovered: string[]; // Array of event IDs included in this settlement
  totalValueFromEventsForDJ: number; // Sum of DJ's share from events where agency received payment
  totalValueFromEventsForAgency: number; // Sum of Agency's share from events where DJ received payment
  netAmount: number; // Positive: Agency owes DJ. Negative: DJ owes Agency.
  status: 'pending_calculation' | 'pending_payment' | 'paid' | 'disputed';
  paymentProofUrl?: string; // Uploaded by admin/partner when paying DJ or by DJ when paying agency
  notes?: string;
  generatedAt: Date;
  paidAt?: Date;
}


export interface GuestList {
  id: string;
  eventId: string;
  promoterId?: string; // UID of promoter/birthday person
  name:string; // List name, e.g., "John's Birthday List"
  guests: Guest[];
}

export interface Guest {
  id: string; // or use array index if not needing unique ID before adding
  name: string;
  value: number; // Price
  type: 'standard' | 'vip' | 'courtesy';
  checkInTime?: Date; // or Timestamp
  checkedInBy?: string; // UID of lister
  addedAt: Date; // or Timestamp
}

// Add other types as needed
