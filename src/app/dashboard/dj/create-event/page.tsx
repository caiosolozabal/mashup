"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
// Importar createEvent e Evento do eventService atualizado
import { createEvent, Evento } from "@/lib/eventService"; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

// Interface para DJ
interface DJ {
  id: string;
  nome: string;
  email?: string;
  percentual_padrao?: number;
}

export default function CreateEventDJPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro", texto: string } | null>(null);
  const storage = getStorage();

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome_evento: "",
    data: "",
    local: "",
    horario: "",
    valor_total: "",
    custos: "",
    observacoes: "",
    tipo_evento: "",
    contratante_nome: "",
    contratante_contato: ""
  });

  // Estado para comprovantes de custos
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estado de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  // Funções de formatação
  const formatPhone = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (numericValue.length <= 11) {
      let formattedValue = numericValue;
      if (numericValue.length > 2) {
        formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2)}`;
      }
      if (numericValue.length > 7) {
        // Ajuste para máscara 9 dígitos
        if (numericValue.length === 11) {
           formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 7)}-${numericValue.slice(7)}`;
        } else {
           formattedValue = `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 6)}-${numericValue.slice(6)}`;
        }
      }
      return formattedValue;
    }
    return value.slice(0, 15); // (XX) XXXXX-XXXX
  };

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "valor_total" || name === "custos") {
      // Permitir apenas dígitos e uma única vírgula
      let filteredValue = value.replace(/[^\d,]/g, "");
      const commaCount = (filteredValue.match(/,/g) || []).length;
      if (commaCount > 1) {
        // Manter apenas a primeira vírgula
        const firstCommaIndex = filteredValue.indexOf(',');
        filteredValue = filteredValue.substring(0, firstCommaIndex + 1) + filteredValue.substring(firstCommaIndex + 1).replace(/,/g, '');
      }
      processedValue = filteredValue;
    } else if (name === "contratante_contato") {
      processedValue = formatPhone(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Função para converter string de moeda (formato pt-BR com vírgula) para número
  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // 1. Remover caracteres não numéricos, exceto a vírgula
    const cleanedValue = value.replace(/[^\d,]/g, '');
    // 2. Substituir a vírgula por ponto para o parse correto
    const normalized = cleanedValue.replace(',', '.');
    // 3. Converter para float
    const numberValue = parseFloat(normalized);
    // 4. Retornar o valor ou 0 se inválido
    return isNaN(numberValue) ? 0 : numberValue;
  };

  // Manipular upload de comprovantes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setComprovantes(prev => [...prev, ...newFiles]);
    }
  };

  // Remover comprovante da lista
  const handleRemoveFile = (index: number) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    if (!formData.nome_evento.trim()) newErrors.nome_evento = "Nome do evento é obrigatório";
    if (!formData.data) newErrors.data = "Data é obrigatória";
    if (!formData.local.trim()) newErrors.local = "Local é obrigatório";

    const valorTotalNumerico = parseCurrency(formData.valor_total);
    if (!formData.valor_total || valorTotalNumerico <= 0) {
      newErrors.valor_total = "Valor total é obrigatório e deve ser um número válido maior que zero";
    }

    const custosNumerico = parseCurrency(formData.custos);
    if (formData.custos && custosNumerico < 0) { // Permite zero
      newErrors.custos = "Custos deve ser um número válido (ou vazio)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fazer upload dos comprovantes
  const uploadComprovantes = async (eventoId: string): Promise<string[]> => {
    if (comprovantes.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    try {
      for (let i = 0; i < comprovantes.length; i++) {
        const file = comprovantes[i];
        const timestamp = new Date().getTime();
        const fileName = `comprovantes/${eventoId}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        urls.push(downloadURL);
        setUploadProgress(Math.round(((i + 1) / comprovantes.length) * 100));
      }
      return urls;
    } catch (error) {
      console.error("Erro ao fazer upload dos comprovantes:", error);
      toast.error("Falha no upload de um ou mais comprovantes.");
      return urls;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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
      if (!user?.uid) {
        throw new Error("Usuário DJ não autenticado ou ID não encontrado. Faça login novamente.");
      }

      // Preparar dados para a função createEvent
      const eventoParaCriar: Omit<Evento, "id" | "created_at" | "updated_at" | "deleted" | "deleted_at" | "deleted_by" | "dj_nome"> = {
        nome_evento: formData.nome_evento.trim(),
        data: formData.data,
        local: formData.local.trim(),
        horario: formData.horario || "",
        valor_total: parseCurrency(formData.valor_total),
        custos: parseCurrency(formData.custos),
        sinal_pago: 0,
        status_pgto: "pendente",
        dj_id: user.uid,
        contratante_nome: formData.contratante_nome.trim(),
        contratante_contato: formData.contratante_contato.trim(),
        observacoes: formData.observacoes.trim(),
        tipo_evento: formData.tipo_evento.trim(),
        status_evento: "confirmado"
      };

      // Chamar a função centralizada createEvent (sem parâmetro isAdmin, removido)
      const eventoId = await createEvent(eventoParaCriar, user.uid);
      
      // Fazer upload dos comprovantes
      let comprovantesUrls: string[] = [];
      if (comprovantes.length > 0) {
        comprovantesUrls = await uploadComprovantes(eventoId);
        
        // Registrar comprovantes no histórico
        if (comprovantesUrls.length > 0) {
          try {
            await addDoc(collection(db, "historico"), {
              tipo: "upload_comprovantes",
              entidade: "evento",
              entidade_id: eventoId,
              usuario_id: user.uid,
              timestamp: serverTimestamp(),
              detalhes: { 
                quantidade: comprovantesUrls.length,
                urls: comprovantesUrls
              }
            });
          } catch (error) {
            console.error("Erro ao registrar histórico de comprovantes:", error);
          }
        }
      }

      toast.success("Evento criado com sucesso!");
      setMensagem({ 
        tipo: "sucesso", 
        texto: `Evento criado com sucesso (ID: ${eventoId})! Redirecionando...` 
      });
      
      // Limpar formulário
      setFormData({
        nome_evento: "",
        data: "",
        local: "",
        horario: "",
        valor_total: "",
        custos: "",
        observacoes: "",
        tipo_evento: "",
        contratante_nome: "",
        contratante_contato: ""
      });
      setComprovantes([]);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/dashboard/dj/agenda");
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao criar evento (DJ):", error);
      toast.error(error.message || "Erro desconhecido ao criar evento");
      setMensagem({ 
        tipo: "erro", 
        texto: error.message || "Erro desconhecido ao criar evento" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="container mx-auto px-4 py-8 app-content">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Criar Novo Evento</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Criar Novo Evento</h1>
          <Link href="/dashboard/dj/agenda" className="btn-secondary">
            Voltar para Agenda
          </Link>
        </div>

        {mensagem && (
          <div className={`mb-6 p-4 rounded-md ${mensagem.tipo === "sucesso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="content-card">
          {/* Bloco 1: Dados Gerais do Evento */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Dados Gerais do Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nome do Evento */}
              <div>
                <label className="form-label">Nome do Evento *</label>
                <input
                  type="text"
                  name="nome_evento"
                  value={formData.nome_evento}
                  onChange={handleChange}
                  placeholder="Ex: Festa Junina"
                  className={`form-input ${errors.nome_evento ? "border-red-500" : ""}`}
                />
                {errors.nome_evento && <p className="text-red-500 text-sm mt-1">{errors.nome_evento}</p>}
              </div>
              {/* Data */}
              <div>
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  className={`form-input ${errors.data ? "border-red-500" : ""}`}
                />
                {errors.data && <p className="text-red-500 text-sm mt-1">{errors.data}</p>}
              </div>
              {/* Horário */}
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
              {/* Local */}
              <div>
                <label className="form-label">Local *</label>
                <input
                  type="text"
                  name="local"
                  value={formData.local}
                  onChange={handleChange}
                  placeholder="Ex: Clube Recreativo"
                  className={`form-input ${errors.local ? "border-red-500" : ""}`}
                />
                {errors.local && <p className="text-red-500 text-sm mt-1">{errors.local}</p>}
              </div>
              {/* Tipo de Evento */}
              <div>
                <label className="form-label">Tipo de Evento</label>
                <input
                  type="text"
                  name="tipo_evento"
                  value={formData.tipo_evento}
                  onChange={handleChange}
                  placeholder="Ex: Festa Temática, Show"
                  className="form-input"
                />
              </div>
              {/* Valor Total */}
              <div>
                <label className="form-label">Valor Total (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-700">R$</span>
                  <input
                    type="text"
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={handleChange}
                    placeholder="1234,56"
                    inputMode="decimal"
                    className={`form-input pl-8 ${errors.valor_total ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.valor_total && <p className="text-red-500 text-sm mt-1">{errors.valor_total}</p>}
              </div>
            </div>
          </div>

          {/* Bloco 2: Custos e Comprovantes */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Custos e Comprovantes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Custos */}
              <div>
                <label className="form-label">Custos (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-700">R$</span>
                  <input
                    type="text"
                    name="custos"
                    value={formData.custos}
                    onChange={handleChange}
                    placeholder="123,45"
                    inputMode="decimal"
                    className={`form-input pl-8 ${errors.custos ? "border-red-500" : ""}`}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Informe despesas como transporte, alimentação, etc. Use vírgula para centavos.
                </p>
                {errors.custos && <p className="text-red-500 text-sm mt-1">{errors.custos}</p>}
              </div>
              {/* Upload Comprovantes */}
              <div>
                <label className="form-label">Upload de Comprovantes</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Carregar arquivos</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF até 10MB cada</p>
                  </div>
                </div>
                {/* Lista de arquivos selecionados */}
                {comprovantes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Arquivos selecionados:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {comprovantes.map((file, index) => (
                        <li key={index} className="flex justify-between items-center">
                          <span>{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Barra de progresso do upload */}
                {uploading && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-700">Enviando comprovantes... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloco 3: Dados do Contratante */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Dados do Contratante</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome do Contratante */}
              <div>
                <label className="form-label">Nome do Contratante</label>
                <input
                  type="text"
                  name="contratante_nome"
                  value={formData.contratante_nome}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva"
                  className="form-input"
                />
              </div>
              {/* Contato do Contratante */}
              <div>
                <label className="form-label">Contato (Telefone/WhatsApp)</label>
                <input
                  type="tel"
                  name="contratante_contato"
                  value={formData.contratante_contato}
                  onChange={handleChange}
                  placeholder="(XX) XXXXX-XXXX"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Bloco 4: Observações */}
          <div className="mb-8">
            <h2 className="section-title border-b pb-2 mb-4">Observações</h2>
            <div>
              <label className="form-label">Observações Adicionais</label>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows={4}
                placeholder="Detalhes sobre o evento, equipamentos necessários, etc."
                className="form-input"
              ></textarea>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4 mt-8">
            <Link href="/dashboard/dj/agenda" className="btn-secondary">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Criar Evento"}
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}
