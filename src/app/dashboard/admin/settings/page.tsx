"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAdmin from "@/components/auth/RequireAdmin";
import Link from "next/link";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";

// Interface para DJ
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
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDJ, setSelectedDJ] = useState<DJ | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado do formulário de edição
  const [formData, setFormData] = useState<Omit<DJ, 'id'>>({
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

  // Carregar DJs
  useEffect(() => {
    const fetchDJs = async () => {
      try {
        // Buscar DJs
        const djsCollection = collection(db, "djs");
        const djsSnapshot = await getDocs(djsCollection);
        const djsList: DJ[] = [];
        
        djsSnapshot.forEach(doc => {
          const djData = doc.data();
          djsList.push({
            id: doc.id,
            nome: djData.nome_completo || djData.nome || "DJ sem nome",
            email: djData.email,
            telefone: djData.telefone,
            cpf: djData.cpf,
            banco: djData.banco,
            agencia: djData.agencia,
            conta: djData.conta,
            tipo_conta: djData.tipo_conta,
            percentual_padrao: djData.percentual_padrao || 70,
            status: djData.status || "ativo"
          });
        });
        
        setDjs(djsList);
      } catch (error) {
        console.error("Erro ao carregar DJs:", error);
        toast.error("Erro ao carregar lista de DJs");
        
        // Dados simulados em caso de erro
        const mockDJs: DJ[] = [
          { 
            id: "dj1", 
            nome: "DJ Carlos", 
            email: "carlos@exemplo.com",
            telefone: "(11) 98765-4321",
            cpf: "123.456.789-00",
            banco: "Nubank",
            agencia: "0001",
            conta: "12345-6",
            tipo_conta: "corrente",
            percentual_padrao: 70,
            status: "ativo"
          },
          { 
            id: "dj2", 
            nome: "DJ Mariana", 
            email: "mariana@exemplo.com",
            telefone: "(11) 91234-5678",
            cpf: "987.654.321-00",
            banco: "Itaú",
            agencia: "1234",
            conta: "56789-0",
            tipo_conta: "corrente",
            percentual_padrao: 75,
            status: "ativo"
          },
          { 
            id: "dj3", 
            nome: "DJ Rafael", 
            email: "rafael@exemplo.com",
            telefone: "(11) 95555-9999",
            cpf: "456.789.123-00",
            banco: "Bradesco",
            agencia: "5678",
            conta: "98765-4",
            tipo_conta: "poupanca",
            percentual_padrao: 70,
            status: "inativo"
          }
        ];
        
        setDjs(mockDJs);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDJs();
  }, []);

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Aplica máscara de CPF
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
    return value;
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
    
    // Aplicar formatação específica para cada campo
    let formattedValue = value;
    
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'percentual_padrao') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        formattedValue = Math.min(100, Math.max(0, numValue)).toString();
      }
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
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }
    
    if (formData.percentual_padrao === undefined || formData.percentual_padrao < 0 || formData.percentual_padrao > 100) {
      newErrors.percentual_padrao = "Percentual deve estar entre 0 e 100";
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
    
    // Validar formulário
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    setSubmitting(true);

    try {
      // Preparar dados do DJ
      const djData = {
        nome_completo: formData.nome.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone?.trim() || "",
        cpf: formData.cpf?.trim() || "",
        banco: formData.banco?.trim() || "",
        agencia: formData.agencia?.trim() || "",
        conta: formData.conta?.trim() || "",
        tipo_conta: formData.tipo_conta || "corrente",
        percentual_padrao: formData.percentual_padrao || 70,
        status: formData.status || "ativo",
        updated_at: serverTimestamp()
      };

      // Atualizar DJ no Firestore
      const djRef = doc(db, "djs", selectedDJ.id);
      await updateDoc(djRef, djData);

      // Registrar ação no histórico
      try {
        const historicoData = {
          user_id: "admin", // Aqui deveria ser o ID do admin logado
          user_role: "admin",
          acao: "dj_atualizado",
          timestamp: serverTimestamp(),
          detalhes: {
            dj_id: selectedDJ.id,
            dj_nome: formData.nome.trim(),
            campos_atualizados: Object.keys(djData)
          }
        };
        
        await addDoc(collection(db, "historico"), historicoData);
      } catch (error) {
        console.error("Erro ao registrar histórico:", error);
        // Não interrompe o fluxo principal se o registro de histórico falhar
      }

      // Atualizar lista de DJs
      setDjs(prev => prev.map(dj => 
        dj.id === selectedDJ.id 
          ? { 
              ...dj, 
              nome: formData.nome,
              email: formData.email,
              telefone: formData.telefone,
              cpf: formData.cpf,
              banco: formData.banco,
              agencia: formData.agencia,
              conta: formData.conta,
              tipo_conta: formData.tipo_conta,
              percentual_padrao: formData.percentual_padrao,
              status: formData.status
            } 
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
            <Link
              href="/dashboard/perfil"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Meu Perfil
            </Link>
          </div>
        </div>

        {/* Gerenciamento de DJs */}
        <div className="content-card mb-8">
          <h2 className="section-title text-blue-700">Gerenciamento de DJs</h2>
          
          {isEditing && selectedDJ ? (
            <form onSubmit={handleSubmit} className="mt-4">
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
                    <p className="text-sm text-gray-500 mt-1">Percentual que o DJ recebe dos eventos (0-100%)</p>
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
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta de Pagamento</option>
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
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn-primary ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </span>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              {djs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Percentual</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {djs.map((dj) => (
                        <tr key={dj.id} className="hover:bg-gray-50">
                          <td>{dj.nome}</td>
                          <td>{dj.email || "-"}</td>
                          <td>{dj.percentual_padrao || 70}%</td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              dj.status === "ativo" ? "bg-green-100 text-green-800" :
                              dj.status === "inativo" ? "bg-gray-100 text-gray-800" :
                              dj.status === "suspenso" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {dj.status === "ativo" ? "Ativo" : 
                               dj.status === "inativo" ? "Inativo" : 
                               dj.status === "suspenso" ? "Suspenso" : 
                               "Não definido"}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleSelectDJ(dj)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum DJ cadastrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Configurações Gerais */}
        <div className="content-card">
          <h2 className="section-title text-blue-700">Configurações Gerais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Perfil da Agência</h3>
              <p className="text-gray-600 mb-4">Gerencie as informações da sua agência, como nome, logo e informações de contato.</p>
              <Link
                href="/dashboard/perfil"
                className="text-blue-600 hover:text-blue-800"
              >
                Editar Perfil da Agência →
              </Link>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Histórico de Ações</h3>
              <p className="text-gray-600 mb-4">Visualize o histórico de todas as ações realizadas no sistema.</p>
              <Link
                href="/dashboard/admin/history"
                className="text-blue-600 hover:text-blue-800"
              >
                Ver Histórico →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
