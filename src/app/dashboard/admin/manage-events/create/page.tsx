"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { doc, collection, addDoc, serverTimestamp, getFirestore, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getAllDJs } from "@/lib/adminService";

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
      try {
        // Buscar DJs do Firestore (agora da coleção users com role: "dj")
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
        console.error("Erro ao carregar DJs:", error);
        toast.error("Erro ao carregar lista de DJs");
        
        // Dados simulados em caso de erro
        const mockDJs: DJ[] = [
          { id: "dj1", nome: "DJ Carlos", percentual_padrao: 70, role: "dj" },
          { id: "dj2", nome: "DJ Mariana", percentual_padrao: 75, role: "dj" },
          { id: "dj3", nome: "DJ Rafael", percentual_padrao: 70, role: "dj" },
        ];
        setDjs(mockDJs);
      } finally {
        setLoading(false);
      }
    };

    fetchDJs();
  }, []);

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
        created_at: serverTimestamp(),
        created_by: user.uid,
        updated_at: serverTimestamp(),
        status_evento: "confirmado",
      };

      // Adicionar evento ao Firestore
      const docRef = await addDoc(collection(db, "eventos"), eventoData);

      // Registrar ação no histórico
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
        // Não interrompe o fluxo principal se o registro de histórico falhar
      }

      toast.success('Evento criado com sucesso!');
      setMensagem({ 
        tipo: 'sucesso', 
        texto: 'Evento criado com sucesso! Redirecionando...' 
      });
      
      // Limpar formulário
      setFormData({
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

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/dashboard/admin/manage-events/table");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao criar evento:", error);
      toast.error(error.message || "Erro ao criar evento");
      setMensagem({ 
        tipo: 'erro', 
        texto: error.message || "Erro ao criar evento" 
      });
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
          {/* Bloco 1: Dados Gerais do Evento */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Dados Gerais do Evento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  name="nome_evento"
                  value={formData.nome_evento}
                  onChange={handleChange}
                  placeholder="Ex: Casamento Silva"
                  className={`w-full border ${errors.nome_evento ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}
                />
                {errors.nome_evento && <p className="text-red-500 text-sm mt-1">{errors.nome_evento}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  className={`w-full border ${errors.data ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}
                />
                {errors.data && <p className="text-red-500 text-sm mt-1">{errors.data}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Horário</label>
                <input
                  type="time"
                  name="horario"
                  value={formData.horario}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Local *</label>
                <input
                  type="text"
                  name="local"
                  value={formData.local}
                  onChange={handleChange}
                  placeholder="Ex: Buffet Estrela"
                  className={`w-full border ${errors.local ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}
                />
                {errors.local && <p className="text-red-500 text-sm mt-1">{errors.local}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Tipo de Evento</label>
                <input
                  type="text"
                  name="tipo_evento"
                  value={formData.tipo_evento}
                  onChange={handleChange}
                  placeholder="Ex: Casamento, Aniversário, Corporativo"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">ID Interno</label>
                <input
                  type="text"
                  name="id_interno"
                  value={formData.id_interno}
                  onChange={handleChange}
                  placeholder="Ex: EVT-2025-001"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Bloco 2: Informações Financeiras */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Informações Financeiras</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">DJ Responsável *</label>
                <select
                  name="dj_id"
                  value={formData.dj_id}
                  onChange={handleChange}
                  className={`w-full border ${errors.dj_id ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}
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
                <label className="block text-gray-700 mb-1">Valor Total (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2">R$</span>
                  <input
                    type="text"
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full border ${errors.valor_total ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 pl-8`}
                  />
                </div>
                {errors.valor_total && <p className="text-red-500 text-sm mt-1">{errors.valor_total}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Sinal Pago (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2">R$</span>
                  <input
                    type="text"
                    name="sinal_pago"
                    value={formData.sinal_pago}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full border ${errors.sinal_pago ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2 pl-8`}
                  />
                </div>
                {errors.sinal_pago && <p className="text-red-500 text-sm mt-1">{errors.sinal_pago}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Conta que Recebeu o Sinal</label>
                <select
                  name="conta_recebimento"
                  value={formData.conta_recebimento}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Selecione uma conta</option>
                  <option value="Conta Principal">Conta Principal</option>
                  <option value="Conta Secundária">Conta Secundária</option>
                  <option value="Conta PJ">Conta PJ</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Status de Pagamento</label>
                <select
                  name="status_pgto"
                  value={formData.status_pgto}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
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
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Informações do Contratante</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Nome do Contratante</label>
                <input
                  type="text"
                  name="contratante_nome"
                  value={formData.contratante_nome}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Contato do Contratante</label>
                <input
                  type="text"
                  name="contratante_contato"
                  value={formData.contratante_contato}
                  onChange={handleChange}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Bloco 4: Observações */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Observações</h2>
            
            <div>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                placeholder="Informações adicionais sobre o evento..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2"
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
                {submitting ? 'Salvando...' : 'Salvar Evento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </RequireAdmin>
  );
}
