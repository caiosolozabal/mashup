"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getAllDJs } from "@/lib/eventService";

// Interface para DJ
interface DJ {
  id: string;
  nome: string;
  email?: string;
  percentual_padrao?: number;
  role: string;
}

// Interface para Evento
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

export default function EditEventPage({ params }: { params: Record<string, any> }) {
  const router = useRouter();
  const { user } = useAuth();
  const { id: eventId } = use(params);

  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [eventoOriginal, setEventoOriginal] = useState<Evento | null>(null);

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

  // Carregar dados do evento e lista de DJs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar dados do evento
        const eventoRef = doc(db, "eventos", eventId);
        const eventoSnap = await getDoc(eventoRef);
        
        if (eventoSnap.exists()) {
          const eventoData = eventoSnap.data() as Omit<Evento, "id">;
          setEventoOriginal({
            id: eventId,
            ...eventoData
          });
          
          // Preencher formulário com dados do evento
          setFormData({
            nome_evento: eventoData.nome_evento || "",
            data: eventoData.data || "",
            local: eventoData.local || "",
            horario: eventoData.horario || "",
            valor_total: eventoData.valor_total ? eventoData.valor_total.toString() : "",
            sinal_pago: eventoData.sinal_pago ? eventoData.sinal_pago.toString() : "",
            conta_recebimento: eventoData.conta_recebimento || "",
            status_pgto: eventoData.status_pgto || "pendente",
            dj_id: eventoData.dj_id || "",
            contratante_nome: eventoData.contratante_nome || "",
            contratante_contato: eventoData.contratante_contato || "",
            observacoes: eventoData.observacoes || "",
            tipo_evento: eventoData.tipo_evento || "",
            id_interno: eventoData.id_interno || ""
          });
        } else {
          toast.error("Evento não encontrado");
          setTimeout(() => {
            router.push("/dashboard/admin/manage-events/table");
          }, 2000);
          return;
        }
        
        // Buscar DJs da coleção users com role: "dj"
        const djsList = await getAllDJs();
        
        if (djsList.length > 0) {
          setDjs(djsList);
        } else {
          // Dados simulados caso não haja DJs no Firestore
          const mockDJs: DJ[] = [
            { id: "dj1", nome: "DJ Carlos", percentual_padrao: 70, role: "dj" },
            { id: "dj2", nome: "DJ Mariana", percentual_padrao: 75, role: "dj" },
            { id: "dj3", nome: "DJ Rafael", percentual_padrao: 70, role: "dj" },
          ];
          setDjs(mockDJs);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do evento");
        
        // Dados simulados em caso de erro
        const mockDJs: DJ[] = [
          { id: "dj1", nome: "DJ Carlos", percentual_padrao: 70, role: "dj" },
          { id: "dj2", nome: "DJ Mariana", percentual_padrao: 75, role: "dj" },
          { id: "dj3", nome: "DJ Rafael", percentual_padrao: 70, role: "dj" },
        ];
        setDjs(mockDJs);
        
        // Redirecionar em caso de erro
        setTimeout(() => {
          router.push("/dashboard/admin/manage-events/table");
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, router]);

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

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Aplica máscara de telefone
    if (numericValue.length <= 11) {
      let formattedValue = numericValue;
      if (numericValue.length > 2) {
        formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2)}`;
      }
      if (numericValue.length > 7) {
        formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 7)}-${numericValue.slice(7)}`;
      }
      return formattedValue;
    }
    return value;
  };

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Aplicar formatação específica para cada campo
    let formattedValue = value;
    
    if (name === 'valor_total' || name === 'sinal_pago') {
      formattedValue = formatCurrency(value);
    } else if (name === 'contratante_contato') {
      formattedValue = formatPhone(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
    // Limpar erro do campo quando ele for alterado
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Validar campos obrigatórios
    if (!formData.nome_evento.trim()) {
      newErrors.nome_evento = "Nome do evento é obrigatório";
    }
    
    if (!formData.data) {
      newErrors.data = "Data é obrigatória";
    }
    
    if (!formData.local.trim()) {
      newErrors.local = "Local é obrigatório";
    }
    
    if (!formData.dj_id) {
      newErrors.dj_id = "Selecione um DJ";
    }
    
    if (!formData.valor_total) {
      newErrors.valor_total = "Valor total é obrigatório";
    } else if (isNaN(parseFloat(formData.valor_total))) {
      newErrors.valor_total = "Valor total deve ser um número válido";
    }
    
    // Validar sinal pago se preenchido
    if (formData.sinal_pago && isNaN(parseFloat(formData.sinal_pago))) {
      newErrors.sinal_pago = "Sinal pago deve ser um número válido";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Duplicar evento atual
  const handleDuplicate = () => {
    // Verificar se há dados suficientes para duplicar
    if (!formData.nome_evento || !formData.data || !formData.local) {
      toast.error("Preencha pelo menos nome, data e local para duplicar o evento");
      return;
    }
    
    // Criar cópia dos dados atuais
    const duplicatedData = {...formData};
    
    // Modificar nome para indicar que é uma cópia
    duplicatedData.nome_evento = `${duplicatedData.nome_evento} (Cópia)`;
    
    // Avançar data em uma semana
    if (duplicatedData.data) {
      const currentDate = new Date(duplicatedData.data);
      currentDate.setDate(currentDate.getDate() + 7);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      duplicatedData.data = `${year}-${month}-${day}`;
    }
    
    // Limpar ID interno para evitar duplicação
    duplicatedData.id_interno = "";
    
    // Atualizar formulário com dados duplicados
    setFormData(duplicatedData);
    
    toast.success("Evento duplicado! Ajuste os dados conforme necessário e salve.");
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    
    // Validar formulário
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    setSubmitting(true);

    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

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
        updated_at: serverTimestamp(),
        updated_by: user.uid,
      };

      // Atualizar evento no Firestore
      const eventoRef = doc(db, "eventos", eventId);
      await updateDoc(eventoRef, eventoData);

      // Registrar ação de edição no histórico
      try {
        const historicoData = {
          user_id: user.uid,
          user_email: user.email,
          user_role: "admin",
          acao: "evento_atualizado",
          timestamp: serverTimestamp(),
          detalhes: {
            evento_id: eventId,
            nome_evento: formData.nome_evento.trim(),
            campos_atualizados: Object.keys(eventoData)
          }
        };
        
        await addDoc(collection(db, "historico"), historicoData);
      } catch (error) {
        console.error("Erro ao registrar histórico:", error);
        // Não interrompe o fluxo principal se o registro de histórico falhar
      }

      toast.success('Evento atualizado com sucesso!');
      setMensagem({ 
        tipo: 'sucesso', 
        texto: 'Evento atualizado com sucesso! Redirecionando...' 
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/dashboard/admin/manage-events/table");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao atualizar evento:", error);
      toast.error(error.message || "Erro ao atualizar evento");
      setMensagem({ 
        tipo: 'erro', 
        texto: error.message || "Erro ao atualizar evento" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Editar Evento</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content bg-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Editar Evento</h1>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/manage-events/table"
              className="btn-secondary"
            >
              Voltar para Lista
            </Link>
            <Link
              href={`/dashboard/admin/manage-events/details/${eventId}`}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Ver Detalhes
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-md ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="content-card bg-white">
          {/* Bloco 1: Dados Gerais do Evento */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Dados Gerais do Evento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Nome do Evento *</label>
                <input
                  type="text"
                  name="nome_evento"
                  value={formData.nome_evento}
                  onChange={handleChange}
                  placeholder="Ex: Casamento Silva"
                  className={`form-input ${errors.nome_evento ? 'border-red-500' : ''}`}
                />
                {errors.nome_evento && <p className="text-red-500 text-sm mt-1">{errors.nome_evento}</p>}
              </div>

              <div>
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  className={`form-input ${errors.data ? 'border-red-500' : ''}`}
                />
                {errors.data && <p className="text-red-500 text-sm mt-1">{errors.data}</p>}
              </div>

              <div>
                <label className="form-label">Horário</label>
                <input
                  type="time"
                  name="horario"
                  value={formData.horario}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Local *</label>
                <input
                  type="text"
                  name="local"
                  value={formData.local}
                  onChange={handleChange}
                  placeholder="Ex: Buffet Estrela"
                  className={`form-input ${errors.local ? 'border-red-500' : ''}`}
                />
                {errors.local && <p className="text-red-500 text-sm mt-1">{errors.local}</p>}
              </div>

              <div>
                <label className="form-label">Tipo de Evento</label>
                <input
                  type="text"
                  name="tipo_evento"
                  value={formData.tipo_evento}
                  onChange={handleChange}
                  placeholder="Ex: Casamento, Aniversário, Corporativo"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">ID Interno</label>
                <input
                  type="text"
                  name="id_interno"
                  value={formData.id_interno}
                  onChange={handleChange}
                  placeholder="Ex: EVT-2025-001"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Bloco 2: Informações Financeiras */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Informações Financeiras</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label">DJ Responsável *</label>
                <select
                  name="dj_id"
                  value={formData.dj_id}
                  onChange={handleChange}
                  className={`form-input ${errors.dj_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Selecione um DJ</option>
                  {djs.map(dj => (
                    <option key={dj.id} value={dj.id}>
                      {dj.nome}
                    </option>
                  ))}
                </select>
                {errors.dj_id && <p className="text-red-500 text-sm mt-1">{errors.dj_id}</p>}
              </div>

              <div>
                <label className="form-label">Valor Total (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2">R$</span>
                  <input
                    type="text"
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`form-input pl-8 ${errors.valor_total ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.valor_total && <p className="text-red-500 text-sm mt-1">{errors.valor_total}</p>}
              </div>

              <div>
                <label className="form-label">Sinal Pago (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2">R$</span>
                  <input
                    type="text"
                    name="sinal_pago"
                    value={formData.sinal_pago}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`form-input pl-8 ${errors.sinal_pago ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.sinal_pago && <p className="text-red-500 text-sm mt-1">{errors.sinal_pago}</p>}
              </div>

              <div>
                <label className="form-label">Conta que Recebeu o Sinal</label>
                <select
                  name="conta_recebimento"
                  value={formData.conta_recebimento}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Selecione uma conta</option>
                  <option value="Conta Principal">Conta Principal</option>
                  <option value="Conta Secundária">Conta Secundária</option>
                  <option value="Conta PJ">Conta PJ</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>

              <div>
                <label className="form-label">Status de Pagamento</label>
                <select
                  name="status_pgto"
                  value={formData.status_pgto}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="quitado">Quitado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloco 3: Informações do Contratante */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Informações do Contratante</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nome do Contratante</label>
                <input
                  type="text"
                  name="contratante_nome"
                  value={formData.contratante_nome}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Contato do Contratante</label>
                <input
                  type="text"
                  name="contratante_contato"
                  value={formData.contratante_contato}
                  onChange={handleChange}
                  placeholder="Ex: (11) 98765-4321"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Bloco 4: Observações */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Observações</h2>
            
            <div>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                placeholder="Informações adicionais sobre o evento..."
                rows={4}
                className="form-input"
              ></textarea>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={handleDuplicate}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Duplicar Evento
              </button>
            </div>
            
            <div className="flex gap-3">
              <Link
                href="/dashboard/admin/manage-events/table"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
              >
                Cancelar
              </Link>
              
              <button
                type="submit"
                disabled={submitting}
                className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </RequireAdmin>
  );
}
