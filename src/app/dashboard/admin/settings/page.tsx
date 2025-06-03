"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
// CORREÇÃO: Adicionar 'where' e 'query'
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";

// Interface para DJ (baseada na coleção 'users')
interface DJ {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: string;
  percentual_padrao?: number;
  status?: string;
  role?: string; // Incluir role para garantir que é DJ
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDJ, setSelectedDJ] = useState<DJ | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado do formulário de edição
  const [formData, setFormData] = useState<Omit<DJ, 'id' | 'role'>>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    percentual_padrao: 70,
    status: "ativo"
  });
  
  // Estado de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Carregar DJs da coleção 'users'
  useEffect(() => {
    const fetchDJs = async () => {
      setLoading(true);
      try {
        // CORREÇÃO: Buscar na coleção 'users' e filtrar por role 'dj'
        const usersCollection = collection(db, "users");
        const djsQuery = query(usersCollection, where("role", "==", "dj"));
        const djsSnapshot = await getDocs(djsQuery);
        const djsList: DJ[] = [];
        
        djsSnapshot.forEach(doc => {
          const djData = doc.data();
          // Mapear campos da coleção 'users' para a interface DJ
          djsList.push({
            id: doc.id,
            nome: djData.nome || "DJ sem nome", // Usar campo 'nome'
            email: djData.email,
            telefone: djData.telefone,
            cpf: djData.cpf,
            banco: djData.banco,
            agencia: djData.agencia,
            conta: djData.conta,
            tipo_conta: djData.tipo_conta,
            percentual_padrao: djData.percentual_padrao || djData.percentual || 70, // Considerar ambos os campos de percentual
            status: djData.status || "ativo",
            role: djData.role // Manter role para referência
          });
        });
        
        setDjs(djsList);
      } catch (error) {
        console.error("Erro ao carregar DJs:", error);
        toast.error("Erro ao carregar lista de DJs");
        // Remover dados simulados em produção
      } finally {
        setLoading(false);
      }
    };
    
    fetchDJs();
  }, []);

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 11) {
      let formattedValue = numericValue;
      if (numericValue.length > 3) {
        formattedValue = `${numericValue.slice(0, 3)}.${numericValue.slice(3)}`;
      }
      if (numericValue.length > 6) {
        formattedValue = `${formattedValue.slice(0, 7)}.${formattedValue.slice(7)}`;
      }
      if (numericValue.length > 9) {
        formattedValue = `${formattedValue.slice(0, 11)}-${formattedValue.slice(11)}`;
      }
      return formattedValue;
    }
    return value.slice(0, 14); // Limita ao tamanho máximo do CPF formatado
  };

  // Função para formatar telefone
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
    return value.slice(0, 16); // Limita ao tamanho máximo do telefone formatado
  };

  // Selecionar DJ para edição
  const handleSelectDJ = (dj: DJ) => {
    setSelectedDJ(dj);
    setFormData({
      nome: dj.nome || "",
      email: dj.email || "",
      telefone: dj.telefone || "",
      cpf: dj.cpf || "",
      banco: dj.banco || "",
      agencia: dj.agencia || "",
      conta: dj.conta || "",
      tipo_conta: dj.tipo_conta || "corrente",
      percentual_padrao: dj.percentual_padrao || 70,
      status: dj.status || "ativo"
    });
    setIsEditing(true);
    setErrors({});
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setSelectedDJ(null);
    setIsEditing(false);
    setErrors({});
  };

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'percentual_padrao') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        formattedValue = Math.min(100, Math.max(0, numValue)).toString();
      } else if (value === "") {
        formattedValue = ""; // Permite limpar o campo
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
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
    
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }
    
    const percentual = formData.percentual_padrao;
    if (percentual === undefined || percentual === null || percentual < 0 || percentual > 100) {
       if (typeof percentual !== 'string' || percentual.trim() !== '') { // Só valida se não estiver vazio
         newErrors.percentual_padrao = "Percentual deve estar entre 0 e 100";
       }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDJ) {
      toast.error("Nenhum DJ selecionado para edição");
      return;
    }
    
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    setSubmitting(true);

    try {
      // CORREÇÃO: Atualizar na coleção 'users'
      const djRef = doc(db, "users", selectedDJ.id);
      
      // Preparar dados para atualização (usando campos da coleção 'users')
      const djDataToUpdate: Partial<DJ> = {
        nome: formData.nome.trim(),
        email: formData.email.trim(), // Geralmente não se atualiza email aqui, mas mantendo por ora
        telefone: formData.telefone?.replace(/\D/g, '') || "", // Salvar apenas números
        cpf: formData.cpf?.replace(/\D/g, '') || "", // Salvar apenas números
        banco: formData.banco?.trim() || "",
        agencia: formData.agencia?.trim() || "",
        conta: formData.conta?.trim() || "",
        tipo_conta: formData.tipo_conta || "corrente",
        percentual_padrao: formData.percentual_padrao || 70,
        status: formData.status || "ativo",
        // updated_at: serverTimestamp() // Firestore atualiza automaticamente?
      };

      await updateDoc(djRef, djDataToUpdate);

      // Registrar ação no histórico (ajustar conforme necessário)
      try {
        const historicoData = {
          user_id: "admin_placeholder", // Substituir pelo ID do admin logado
          user_role: "admin",
          acao: "dj_atualizado",
          timestamp: serverTimestamp(),
          detalhes: {
            dj_id: selectedDJ.id,
            dj_nome: formData.nome.trim(),
            campos_atualizados: Object.keys(djDataToUpdate)
          }
        };
        await addDoc(collection(db, "historico"), historicoData);
      } catch (histError) {
        console.error("Erro ao registrar histórico:", histError);
      }

      // Atualizar lista de DJs localmente
      setDjs(prev => prev.map(dj => 
        dj.id === selectedDJ.id 
          ? { ...dj, ...formData } // Atualiza com os dados do formulário
          : dj
      ));

      toast.success('DJ atualizado com sucesso!');
      setSelectedDJ(null);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Erro ao atualizar DJ:", error);
      toast.error(error.message || "Erro ao atualizar DJ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RequireAdmin>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Configurações</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8 app-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin"
              className="btn-secondary"
            >
              Voltar para Dashboard
            </Link>
            {/* Remover link para perfil se não for relevante aqui */}
          </div>
        </div>

        {/* Gerenciamento de DJs */}
        <div className="content-card mb-8">
          <h2 className="section-title text-blue-700">Gerenciamento de DJs</h2>
          
          {isEditing && selectedDJ ? (
            // Formulário de Edição (mantido como estava, mas agora opera sobre dados da coleção 'users')
            <form onSubmit={handleSubmit} className="mt-4">
              {/* ... (código do formulário omitido para brevidade) ... */}
               <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                 <div className="flex">
                   <div className="flex-shrink-0">
                     <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                     </svg>
                   </div>
                   <div className="ml-3">
                     <p className="text-sm text-blue-700">
                       Editando DJ: <strong>{selectedDJ.nome}</strong>
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Dados Básicos */}
               <div className="mb-6">
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Dados Básicos</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   <div>
                     <label className="form-label">Nome *</label>
                     <input
                       type="text"
                       name="nome"
                       value={formData.nome}
                       onChange={handleChange}
                       className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
                     />
                     {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                   </div>
                   
                   <div>
                     <label className="form-label">E-mail *</label>
                     <input
                       type="email"
                       name="email"
                       value={formData.email}
                       onChange={handleChange}
                       className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                       readOnly // Email geralmente não é editável aqui
                     />
                     {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                   </div>
                   
                   <div>
                     <label className="form-label">Telefone</label>
                     <input
                       type="text"
                       name="telefone"
                       value={formData.telefone}
                       onChange={handleChange}
                       className="form-input"
                       placeholder="(XX) XXXXX-XXXX"
                     />
                   </div>
                   
                   <div>
                     <label className="form-label">CPF</label>
                     <input
                       type="text"
                       name="cpf"
                       value={formData.cpf}
                       onChange={handleChange}
                       className="form-input"
                       placeholder="XXX.XXX.XXX-XX"
                     />
                   </div>
                   
                   <div>
                     <label className="form-label">Status</label>
                     <select
                       name="status"
                       value={formData.status}
                       onChange={handleChange}
                       className="form-select"
                     >
                       <option value="ativo">Ativo</option>
                       <option value="inativo">Inativo</option>
                       <option value="suspenso">Suspenso</option>
                     </select>
                   </div>
                 </div>
               </div>
               
               {/* Dados Financeiros */}
               <div className="mb-6">
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Dados Financeiros</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   <div>
                     <label className="form-label">Percentual Padrão (%) *</label>
                     <input
                       type="number"
                       name="percentual_padrao"
                       value={formData.percentual_padrao}
                       onChange={handleChange}
                       min="0"
                       max="100"
                       className={`form-input ${errors.percentual_padrao ? 'border-red-500' : ''}`}
                     />
                     <p className="text-sm text-gray-500 mt-1">Percentual que o DJ recebe (0-100%)</p>
                     {errors.percentual_padrao && <p className="text-red-500 text-sm mt-1">{errors.percentual_padrao}</p>}
                   </div>
                   <div>
                     <label className="form-label">Banco</label>
                     <input
                       type="text"
                       name="banco"
                       value={formData.banco}
                       onChange={handleChange}
                       className="form-input"
                     />
                   </div>
                   <div>
                     <label className="form-label">Agência</label>
                     <input
                       type="text"
                       name="agencia"
                       value={formData.agencia}
                       onChange={handleChange}
                       className="form-input"
                     />
                   </div>
                   <div>
                     <label className="form-label">Conta</label>
                     <input
                       type="text"
                       name="conta"
                       value={formData.conta}
                       onChange={handleChange}
                       className="form-input"
                     />
                   </div>
                   <div>
                     <label className="form-label">Tipo de Conta</label>
                     <select
                       name="tipo_conta"
                       value={formData.tipo_conta}
                       onChange={handleChange}
                       className="form-select"
                     >
                       <option value="corrente">Corrente</option>
                       <option value="poupanca">Poupança</option>
                       <option value="pagamento">Pagamento</option>
                     </select>
                   </div>
                 </div>
               </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </div>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Tabela de DJs
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="table-header">Nome</th>
                    <th className="table-header">E-mail</th>
                    <th className="table-header">Telefone</th>
                    <th className="table-header">Percentual (%)</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {djs.length > 0 ? (
                    djs.map((dj) => (
                      <tr key={dj.id} className="hover:bg-gray-50">
                        <td className="table-cell">{dj.nome}</td>
                        <td className="table-cell">{dj.email}</td>
                        <td className="table-cell">{formatPhone(dj.telefone || "")}</td>
                        <td className="table-cell text-center">{dj.percentual_padrao}%</td>
                        <td className="table-cell">
                          <span className={`status-badge ${dj.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {dj.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => handleSelectDJ(dj)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">
                        Nenhum DJ encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Outras Configurações (Exemplo) */}
        {/* 
        <div className="content-card">
          <h2 className="section-title text-blue-700">Outras Configurações</h2>
          <p className="text-gray-600 mt-2">
            Aqui podem ser adicionadas outras configurações gerais do sistema.
          </p>
        </div>
        */}
      </div>
    </RequireAdmin>
  );
}

// Estilos reutilizáveis (ajuste conforme seu design system)
const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
const labelStyle = "block text-sm font-medium text-gray-700";
const selectStyle = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md";

