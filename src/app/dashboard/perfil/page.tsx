"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import Link from "next/link";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Interface para dados do perfil
interface PerfilUsuario {
  nome_completo: string;
  cpf: string;
  telefone: string;
  email: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta?: string;
  percentual_padrao?: number; // Apenas para DJs
}

export default function PerfilPage() {
  const router = useRouter();
  const { user, isAdmin, isDJ } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState<PerfilUsuario>({
    nome_completo: "",
    cpf: "",
    telefone: "",
    email: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    percentual_padrao: 70 // Padrão 70% para DJs
  });

  // Estado de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Carregar dados do perfil
  useEffect(() => {
    const fetchPerfil = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Buscar dados do perfil no Firestore
        const perfilRef = doc(db, isDJ ? "djs" : "admins", user.uid);
        const perfilSnap = await getDoc(perfilRef);
        
        if (perfilSnap.exists()) {
          const perfilData = perfilSnap.data() as PerfilUsuario;
          setFormData({
            nome_completo: perfilData.nome_completo || "",
            cpf: perfilData.cpf || "",
            telefone: perfilData.telefone || "",
            email: perfilData.email || user.email || "",
            banco: perfilData.banco || "",
            agencia: perfilData.agencia || "",
            conta: perfilData.conta || "",
            tipo_conta: perfilData.tipo_conta || "corrente",
            percentual_padrao: perfilData.percentual_padrao || 70
          });
        } else {
          // Se não existir, preencher com dados básicos do usuário
          setFormData(prev => ({
            ...prev,
            email: user.email || ""
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        toast.error("Erro ao carregar dados do perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [user, isDJ]);

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
    if (!formData.nome_completo.trim()) {
      newErrors.nome_completo = "Nome completo é obrigatório";
    }
    
    if (!formData.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = "CPF inválido";
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = "Telefone inválido";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }
    
    if (!formData.banco.trim()) {
      newErrors.banco = "Banco é obrigatório";
    }
    
    if (!formData.agencia.trim()) {
      newErrors.agencia = "Agência é obrigatória";
    }
    
    if (!formData.conta.trim()) {
      newErrors.conta = "Conta é obrigatória";
    }
    
    if (isDJ && (formData.percentual_padrao === undefined || formData.percentual_padrao < 0 || formData.percentual_padrao > 100)) {
      newErrors.percentual_padrao = "Percentual deve estar entre 0 e 100";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      // Preparar dados do perfil
      const perfilData = {
        nome_completo: formData.nome_completo.trim(),
        cpf: formData.cpf.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        banco: formData.banco.trim(),
        agencia: formData.agencia.trim(),
        conta: formData.conta.trim(),
        tipo_conta: formData.tipo_conta,
        updated_at: serverTimestamp(),
      };
      
      // Adicionar percentual_padrao apenas para DJs
      if (isDJ) {
        Object.assign(perfilData, {
          percentual_padrao: formData.percentual_padrao
        });
      }

      // Atualizar perfil no Firestore
      const perfilRef = doc(db, isDJ ? "djs" : "admins", user.uid);
      await updateDoc(perfilRef, perfilData);

      // Registrar ação no histórico
      try {
        const historicoData = {
          user_id: user.uid,
          user_email: user.email,
          user_role: isDJ ? "dj" : "admin",
          acao: "perfil_atualizado",
          timestamp: serverTimestamp(),
          detalhes: {
            campos_atualizados: Object.keys(perfilData)
          }
        };
        
        await addDoc(collection(db, "historico"), historicoData);
      } catch (error) {
        console.error("Erro ao registrar histórico:", error);
        // Não interrompe o fluxo principal se o registro de histórico falhar
      }

      toast.success('Perfil atualizado com sucesso!');
      setMensagem({ 
        tipo: 'sucesso', 
        texto: 'Perfil atualizado com sucesso!' 
      });
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
      setMensagem({ 
        tipo: 'erro', 
        texto: error.message || "Erro ao atualizar perfil" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Meu Perfil</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8 app-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          
          <Link
            href={isDJ ? "/dashboard/dj" : "/dashboard/admin"}
            className="btn-secondary"
          >
            Voltar para Dashboard
          </Link>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-md ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="content-card">
          {/* Bloco 1: Dados Pessoais */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Dados Pessoais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva"
                  className={`form-input ${errors.nome_completo ? 'border-red-500' : ''}`}
                />
                {errors.nome_completo && <p className="text-red-500 text-sm mt-1">{errors.nome_completo}</p>}
              </div>

              <div>
                <label className="form-label">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="Ex: 123.456.789-00"
                  className={`form-input ${errors.cpf ? 'border-red-500' : ''}`}
                />
                {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
              </div>

              <div>
                <label className="form-label">Telefone *</label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="Ex: (11) 98765-4321"
                  className={`form-input ${errors.telefone ? 'border-red-500' : ''}`}
                />
                {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
              </div>

              <div>
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Ex: seu.email@exemplo.com"
                  className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Bloco 2: Dados Bancários */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Dados Bancários</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Banco *</label>
                <input
                  type="text"
                  name="banco"
                  value={formData.banco}
                  onChange={handleChange}
                  placeholder="Ex: Itaú, Nubank, Bradesco"
                  className={`form-input ${errors.banco ? 'border-red-500' : ''}`}
                />
                {errors.banco && <p className="text-red-500 text-sm mt-1">{errors.banco}</p>}
              </div>

              <div>
                <label className="form-label">Agência *</label>
                <input
                  type="text"
                  name="agencia"
                  value={formData.agencia}
                  onChange={handleChange}
                  placeholder="Ex: 1234"
                  className={`form-input ${errors.agencia ? 'border-red-500' : ''}`}
                />
                {errors.agencia && <p className="text-red-500 text-sm mt-1">{errors.agencia}</p>}
              </div>

              <div>
                <label className="form-label">Conta *</label>
                <input
                  type="text"
                  name="conta"
                  value={formData.conta}
                  onChange={handleChange}
                  placeholder="Ex: 12345-6"
                  className={`form-input ${errors.conta ? 'border-red-500' : ''}`}
                />
                {errors.conta && <p className="text-red-500 text-sm mt-1">{errors.conta}</p>}
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

              {isDJ && (
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
                  <p className="text-sm text-gray-500 mt-1">Percentual que você recebe dos eventos (0-100%)</p>
                  {errors.percentual_padrao && <p className="text-red-500 text-sm mt-1">{errors.percentual_padrao}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 mt-6">
            <Link
              href={isDJ ? "/dashboard/dj" : "/dashboard/admin"}
              className="btn-secondary"
            >
              Cancelar
            </Link>
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
      </div>
    </RequireAuth>
  );
}
