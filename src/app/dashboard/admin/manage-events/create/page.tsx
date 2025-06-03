"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { doc, collection, addDoc, serverTimestamp, getFirestore, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getAllDJs } from "@/lib/eventService"; // Usando eventService para buscar DJs

// Interface para DJ
interface DJ {
  id: string;
  nome: string;
  email?: string;
  percentual_padrao?: number;
  role: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome_evento: "",
    data: "",
    local: "",
    horario: "",
    valor_total: "",
    sinal_pago: "",
    conta_recebimento: "",
    status_pgto: "pendente",
    dj_id: "",
    contratante_nome: "",
    contratante_contato: "",
    observacoes: "",
    tipo_evento: "",
    id_interno: ""
  });

  // Estado de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Carregar lista de DJs
  useEffect(() => {
    const fetchDJs = async () => {
      setLoading(true);
      try {
        // Apenas busca a lista de DJs
        const djsList = await getAllDJs();
        setDjs(djsList);
      } catch (error) {
        console.error("Erro ao carregar DJs:", error);
        toast.error("Erro ao carregar lista de DJs");
      } finally {
        setLoading(false);
      }
    };

    fetchDJs();
  }, []); // Dependência vazia, executa apenas uma vez

  // Função para formatar valores monetários (mantida)
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue) {
      const floatValue = parseFloat(numericValue) / 100;
      return floatValue.toFixed(2);
    }
    return '';
  };

  // Função para formatar telefone (mantida)
  const formatPhone = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 11) {
      let formattedValue = numericValue;
      if (numericValue.length > 0) {
        formattedValue = `(${numericValue.slice(0, 2)}`;
      }
      if (numericValue.length >= 3) {
        formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2)}`;
      }
      if (numericValue.length >= 8) {
        formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 7)}-${numericValue.slice(7)}`;
      }
       if (numericValue.length === 11) { // Celular com 9 dígitos
         formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 3)} ${numericValue.slice(3, 7)}-${numericValue.slice(7)}`;
       }
      return formattedValue;
    }
    return value.slice(0, 16);
  };

  // Manipular mudanças no formulário (mantida)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'valor_total' || name === 'sinal_pago') {
      formattedValue = formatCurrency(value);
    } else if (name === 'contratante_contato') {
      formattedValue = formatPhone(value);
    }
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = {...prev}; delete newErrors[name]; return newErrors; });
    }
  };

  // Validar formulário (mantida)
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    if (!formData.nome_evento.trim()) newErrors.nome_evento = "Nome do evento é obrigatório";
    if (!formData.data) newErrors.data = "Data é obrigatória";
    if (!formData.local.trim()) newErrors.local = "Local é obrigatório";
    if (!formData.dj_id) newErrors.dj_id = "Selecione um DJ";
    if (!formData.valor_total) newErrors.valor_total = "Valor total é obrigatório";
    else if (isNaN(parseFloat(formData.valor_total))) newErrors.valor_total = "Valor total deve ser um número válido";
    if (formData.sinal_pago && isNaN(parseFloat(formData.sinal_pago))) newErrors.sinal_pago = "Sinal pago deve ser um número válido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Duplicar evento atual (mantida)
  const handleDuplicate = () => {
    if (!formData.nome_evento || !formData.data || !formData.local) {
      toast.error("Preencha pelo menos nome, data e local para duplicar o evento");
      return;
    }
    const duplicatedData = {...formData};
    duplicatedData.nome_evento = `${duplicatedData.nome_evento} (Cópia)`;
    if (duplicatedData.data) {
      const currentDate = new Date(`${duplicatedData.data}T00:00:00`); // Adiciona T00:00:00 para evitar problemas de fuso
      currentDate.setDate(currentDate.getDate() + 7);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      duplicatedData.data = `${year}-${month}-${day}`;
    }
    duplicatedData.id_interno = "";
    setFormData(duplicatedData);
    toast.success("Evento duplicado! Ajuste os dados conforme necessário e salve.");
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    setSubmitting(true);

    try {
      if (!user) throw new Error("Usuário não autenticado");

      // Preparar dados do evento
      const eventoData = {
        nome_evento: formData.nome_evento.trim(),
        data: formData.data,
        local: formData.local.trim(),
        horario: formData.horario,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : 0,
        sinal_pago: formData.sinal_pago ? parseFloat(formData.sinal_pago) : 0,
        conta_recebimento: formData.conta_recebimento.trim(),
        status_pgto: formData.status_pgto,
        dj_id: formData.dj_id,
        dj_nome: djs.find(dj => dj.id === formData.dj_id)?.nome || "",
        contratante_nome: formData.contratante_nome.trim(),
        contratante_contato: formData.contratante_contato.trim(),
        observacoes: formData.observacoes.trim(),
        tipo_evento: formData.tipo_evento.trim(),
        id_interno: formData.id_interno.trim(),
        created_at: serverTimestamp(),
        created_by: user.uid,
        updated_at: serverTimestamp(),
        status_evento: "confirmado",
        deleted: false // <-- CORREÇÃO: Garantir que o campo deleted seja incluído
      };

      // Adicionar evento ao Firestore
      const docRef = await addDoc(collection(db, "eventos"), eventoData);

      // Registrar ação no histórico (mantido)
      try {
        const historicoData = {
          user_id: user.uid,
          user_email: user.email,
          user_role: "admin",
          acao: "evento_criado",
          timestamp: serverTimestamp(),
          detalhes: {
            evento_id: docRef.id,
            nome_evento: formData.nome_evento.trim(),
            dj_id: formData.dj_id,
            dj_nome: djs.find(dj => dj.id === formData.dj_id)?.nome || ""
          }
        };
        await addDoc(collection(db, "historico"), historicoData);
      } catch (error) {
        console.error("Erro ao registrar histórico:", error);
      }

      toast.success('Evento criado com sucesso!');
      setMensagem({ tipo: 'sucesso', texto: 'Evento criado com sucesso! Redirecionando...' });
      
      // Limpar formulário (mantido)
      setFormData({
        nome_evento: "", data: "", local: "", horario: "", valor_total: "", sinal_pago: "",
        conta_recebimento: "", status_pgto: "pendente", dj_id: "", contratante_nome: "",
        contratante_contato: "", observacoes: "", tipo_evento: "", id_interno: ""
      });

      // Redirecionar após 2 segundos (mantido)
      setTimeout(() => {
        router.push("/dashboard/admin/manage-events/table");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao criar evento:", error);
      toast.error(error.message || "Erro ao criar evento");
      setMensagem({ tipo: 'erro', texto: error.message || "Erro ao criar evento" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Criar Novo Evento</h1>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-md ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
          {/* Bloco 1: Dados Gerais do Evento (mantido) */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Dados Gerais do Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ... (campos mantidos) ... */}
               <div>
                 <label className="block text-gray-700 mb-1">Nome do Evento *</label>
                 <input type="text" name="nome_evento" value={formData.nome_evento} onChange={handleChange} placeholder="Ex: Casamento Silva" className={`w-full border ${errors.nome_evento ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`} />
                 {errors.nome_evento && <p className="text-red-500 text-sm mt-1">{errors.nome_evento}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Data *</label>
                 <input type="date" name="data" value={formData.data} onChange={handleChange} className={`w-full border ${errors.data ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`} />
                 {errors.data && <p className="text-red-500 text-sm mt-1">{errors.data}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Horário</label>
                 <input type="time" name="horario" value={formData.horario} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Local *</label>
                 <input type="text" name="local" value={formData.local} onChange={handleChange} placeholder="Ex: Buffet Estrela" className={`w-full border ${errors.local ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`} />
                 {errors.local && <p className="text-red-500 text-sm mt-1">{errors.local}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Tipo de Evento</label>
                 <input type="text" name="tipo_evento" value={formData.tipo_evento} onChange={handleChange} placeholder="Ex: Casamento, Aniversário, Corporativo" className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">ID Interno</label>
                 <input type="text" name="id_interno" value={formData.id_interno} onChange={handleChange} placeholder="Ex: EVT-2025-001" className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
            </div>
          </div>

          {/* Bloco 2: Informações Financeiras (mantido) */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Informações Financeiras</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ... (campos mantidos) ... */}
               <div>
                 <label className="block text-gray-700 mb-1">DJ Responsável *</label>
                 <select name="dj_id" value={formData.dj_id} onChange={handleChange} className={`w-full border ${errors.dj_id ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}>
                   <option value="">Selecione um DJ</option>
                   {djs.map(dj => (<option key={dj.id} value={dj.id}>{dj.nome}</option>))}
                 </select>
                 {errors.dj_id && <p className="text-red-500 text-sm mt-1">{errors.dj_id}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Valor Total (R$) *</label>
                 <div className="relative">
                   <span className="absolute left-3 top-2">R$</span>
                   <input type="text" name="valor_total" value={formData.valor_total} onChange={handleChange} placeholder="0.00" className={`w-full border ${errors.valor_total ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 pl-8`} />
                 </div>
                 {errors.valor_total && <p className="text-red-500 text-sm mt-1">{errors.valor_total}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Sinal Pago (R$)</label>
                 <div className="relative">
                   <span className="absolute left-3 top-2">R$</span>
                   <input type="text" name="sinal_pago" value={formData.sinal_pago} onChange={handleChange} placeholder="0.00" className={`w-full border ${errors.sinal_pago ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 pl-8`} />
                 </div>
                 {errors.sinal_pago && <p className="text-red-500 text-sm mt-1">{errors.sinal_pago}</p>}
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Conta de Recebimento</label>
                 <input type="text" name="conta_recebimento" value={formData.conta_recebimento} onChange={handleChange} placeholder="Ex: Conta Principal" className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Status Pagamento</label>
                 <select name="status_pgto" value={formData.status_pgto} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2">
                   <option value="pendente">Pendente</option>
                   <option value="parcial">Parcial</option>
                   <option value="quitado">Quitado</option>
                 </select>
               </div>
            </div>
          </div>

          {/* Bloco 3: Informações do Contratante (mantido) */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Informações do Contratante</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ... (campos mantidos) ... */}
               <div>
                 <label className="block text-gray-700 mb-1">Nome do Contratante</label>
                 <input type="text" name="contratante_nome" value={formData.contratante_nome} onChange={handleChange} placeholder="Ex: João da Silva" className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
               <div>
                 <label className="block text-gray-700 mb-1">Contato (Telefone/E-mail)</label>
                 <input type="text" name="contratante_contato" value={formData.contratante_contato} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className="w-full border border-gray-300 rounded px-3 py-2" />
               </div>
            </div>
          </div>

          {/* Bloco 4: Observações (mantido) */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Observações</h2>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={4}
              placeholder="Detalhes adicionais sobre o evento..."
              className="w-full border border-gray-300 rounded px-3 py-2"
            ></textarea>
          </div>

          {/* Botões de Ação (mantido) */}
          <div className="flex flex-col md:flex-row justify-end items-center gap-4">
            <button
              type="button"
              onClick={handleDuplicate}
              className="btn-secondary w-full md:w-auto"
            >
              Duplicar Evento
            </button>
            <Link
              href="/dashboard/admin/manage-events/table"
              className="btn-secondary w-full md:w-auto text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full md:w-auto"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                "Criar Evento"
              )}
            </button>
          </div>
        </form>
      </div>
    </RequireAdmin>
  );
}

