"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getEventById, updateEvent, Evento } from "@/lib/eventService";
import Link from "next/link";
import { toast } from "sonner";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditEventDJPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const [comprovantesExistentes, setComprovantesExistentes] = useState<string[]>([]);
  const [comprovantesPreview, setComprovantesPreview] = useState<string[]>([]);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome_evento: "",
    data: "",
    local: "",
    horario: "",
    valor_total: "",
    custos: "",
    percentual_dj: "",
    contratante_nome: "",
    contratante_contato: "",
    observacoes: "",
    tipo_evento: "",
    sinal_pago: "",
    conta_recebimento: "",
    status_pgto: "pendente"
  });

  // Estado de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        if (!user?.uid) {
          throw new Error("Usuário não autenticado");
        }

        if (!id || typeof id !== "string") {
          throw new Error("ID do evento inválido");
        }

        const eventoData = await getEventById(id);
        
        if (!eventoData) {
          throw new Error("Evento não encontrado");
        }

        // Verificar se o evento pertence ao DJ logado
        if (eventoData.dj_id !== user.uid && user.role !== "admin") {
          throw new Error("Você não tem permissão para editar este evento");
        }

        setEvento(eventoData);
        
        // Preencher formulário com dados do evento
        setFormData({
          nome_evento: eventoData.nome_evento || "",
          data: eventoData.data || "",
          local: eventoData.local || "",
          horario: eventoData.horario || "",
          valor_total: eventoData.valor_total ? eventoData.valor_total.toString() : "",
          custos: eventoData.custos ? eventoData.custos.toString() : "",
          percentual_dj: eventoData.percentual_dj ? eventoData.percentual_dj.toString() : "70",
          contratante_nome: eventoData.contratante_nome || "",
          contratante_contato: eventoData.contratante_contato || "",
          observacoes: eventoData.observacoes || "",
          tipo_evento: eventoData.tipo_evento || "",
          sinal_pago: eventoData.sinal_pago ? eventoData.sinal_pago.toString() : "",
          conta_recebimento: eventoData.conta_recebimento || "",
          status_pgto: eventoData.status_pgto || "pendente"
        });
        
        // Carregar comprovantes existentes
        if (eventoData.comprovantes_custos && eventoData.comprovantes_custos.length > 0) {
          setComprovantesExistentes(eventoData.comprovantes_custos);
        }
      } catch (error) {
        console.error("Erro ao carregar evento:", error);
        setError(error instanceof Error ? error.message : "Erro ao carregar evento");
        toast.error("Erro ao carregar detalhes do evento");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEvento();
    }
  }, [id, user]);

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
    
    if (name === 'valor_total' || name === 'custos') {
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

  // Manipular upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setComprovantes(prev => [...prev, ...newFiles]);
      
      // Criar previews para os novos arquivos
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setComprovantesPreview(prev => [...prev, ...newPreviews]);
    }
  };

  // Remover comprovante da lista de upload
  const removeComprovante = (index: number) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
    
    // Liberar URL do objeto
    URL.revokeObjectURL(comprovantesPreview[index]);
    setComprovantesPreview(prev => prev.filter((_, i) => i !== index));
  };

  // Remover comprovante existente
  const removeComprovanteExistente = (index: number) => {
    setComprovantesExistentes(prev => prev.filter((_, i) => i !== index));
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
    
    if (!formData.valor_total) {
      newErrors.valor_total = "Valor total é obrigatório";
    } else if (isNaN(parseFloat(formData.valor_total))) {
      newErrors.valor_total = "Valor total deve ser um número válido";
    }
    
    if (formData.custos && isNaN(parseFloat(formData.custos))) {
      newErrors.custos = "Custos deve ser um número válido";
    }
    
    if (formData.percentual_dj && isNaN(parseFloat(formData.percentual_dj))) {
      newErrors.percentual_dj = "Percentual deve ser um número válido";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      if (!id || typeof id !== "string") {
        throw new Error("ID do evento inválido");
      }

      // Upload de comprovantes
      let comprovantesUrls = [...comprovantesExistentes];
      
      if (comprovantes.length > 0) {
        const storage = getStorage();
        
        for (const file of comprovantes) {
          const fileRef = ref(storage, `comprovantes/${id}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(fileRef);
          comprovantesUrls.push(downloadUrl);
        }
      }

      // Preparar dados do evento
      const eventoData: Partial<Evento> = {
        nome_evento: formData.nome_evento.trim(),
        data: formData.data,
        local: formData.local.trim(),
        horario: formData.horario,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : 0,
        sinal_pago: formData.sinal_pago ? parseFloat(formData.sinal_pago) : 0,
        conta_recebimento: formData.conta_recebimento,
        status_pgto: formData.status_pgto,
        custos: formData.custos ? parseFloat(formData.custos) : 0,
        percentual_dj: formData.percentual_dj ? parseFloat(formData.percentual_dj) : 70,
        contratante_nome: formData.contratante_nome.trim(),
        contratante_contato: formData.contratante_contato.trim(),
        observacoes: formData.observacoes.trim(),
        tipo_evento: formData.tipo_evento.trim(),
        comprovantes_custos: comprovantesUrls
      };

      // Atualizar evento no Firestore
      await updateEvent(id, eventoData, user.uid);

      toast.success('Evento atualizado com sucesso!');
      
      // Redirecionar após 1 segundo
      setTimeout(() => {
        router.push("/dashboard/dj/agenda");
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao atualizar evento:", error);
      toast.error(error.message || "Erro ao atualizar evento");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Editar Evento</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Editar Evento</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Erro ao carregar evento</p>
          <p>{error}</p>
        </div>
        <Link 
          href="/dashboard/dj/agenda" 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          Voltar para Agenda
        </Link>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Editar Evento</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
          <p>Evento não encontrado ou você não tem permissão para editá-lo.</p>
        </div>
        <Link 
          href="/dashboard/dj/agenda" 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          Voltar para Agenda
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Editar Evento</h1>
        <div className="flex flex-wrap gap-2">
          <Link 
            href="/dashboard/dj/agenda" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
          >
            Cancelar
          </Link>
          <Link 
            href={`/dashboard/dj/eventos/${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Ver Detalhes
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        {/* Dados Gerais do Evento */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Dados Gerais do Evento</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento *</label>
              <input
                type="text"
                name="nome_evento"
                value={formData.nome_evento}
                onChange={handleChange}
                placeholder="Ex: Casamento Silva"
                className={`w-full px-3 py-2 border rounded-md ${errors.nome_evento ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.nome_evento && <p className="text-red-500 text-sm mt-1">{errors.nome_evento}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.data ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.data && <p className="text-red-500 text-sm mt-1">{errors.data}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <input
                type="time"
                name="horario"
                value={formData.horario}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
              <input
                type="text"
                name="local"
                value={formData.local}
                onChange={handleChange}
                placeholder="Ex: Buffet Estrela"
                className={`w-full px-3 py-2 border rounded-md ${errors.local ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.local && <p className="text-red-500 text-sm mt-1">{errors.local}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
              <input
                type="text"
                name="tipo_evento"
                value={formData.tipo_evento}
                onChange={handleChange}
                placeholder="Ex: Casamento, Aniversário, Corporativo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Informações Financeiras */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informações Financeiras</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-700">R$</span>
                <input
                  type="text"
                  name="valor_total"
                  value={formData.valor_total}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 pl-8 border rounded-md ${errors.valor_total ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.valor_total && <p className="text-red-500 text-sm mt-1">{errors.valor_total}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sinal Pago (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-700">R$</span>
                <input
                  type="text"
                  name="sinal_pago"
                  value={formData.sinal_pago || ""}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta que Recebeu</label>
              <select
                name="conta_recebimento"
                value={formData.conta_recebimento || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecione</option>
                <option value="dj">Conta do DJ</option>
                <option value="agencia">Conta da Agência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status de Pagamento</label>
              <select
                name="status_pgto"
                value={formData.status_pgto || "pendente"}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="quitado">Quitado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custos (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-700">R$</span>
                <input
                  type="text"
                  name="custos"
                  value={formData.custos}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 pl-8 border rounded-md ${errors.custos ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.custos && <p className="text-red-500 text-sm mt-1">{errors.custos}</p>}
              <p className="text-sm text-gray-500 mt-1">Despesas como transporte, alimentação, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentual do DJ (%)</label>
              <div className="relative w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
                {formData.percentual_dj}
                <span className="absolute right-3 top-2 text-gray-700">%</span>
                <span className="block text-xs text-gray-500 mt-1">(Editável apenas pelo admin)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comprovantes de Custos */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Comprovantes de Custos</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anexar Comprovantes (notas fiscais, recibos, etc.)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 5MB por arquivo.
            </p>
          </div>

          {/* Comprovantes existentes */}
          {comprovantesExistentes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md font-medium mb-2">Comprovantes Existentes:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {comprovantesExistentes.map((url, index) => (
                  <div key={`existing-${index}`} className="border rounded-md p-3 flex justify-between items-center">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Comprovante {index + 1}
                    </a>
                    <button 
                      type="button"
                      onClick={() => removeComprovanteExistente(index)}
                      className="text-red-600 hover:text-red-800"
                      title="Remover comprovante"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos comprovantes para upload */}
          {comprovantes.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-2">Novos Comprovantes:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {comprovantes.map((file, index) => (
                  <div key={`new-${index}`} className="border rounded-md p-3 flex justify-between items-center">
                    <span className="truncate">{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeComprovante(index)}
                      className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                      title="Remover comprovante"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Informações do Contratante */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informações do Contratante</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contratante</label>
              <input
                type="text"
                name="contratante_nome"
                value={formData.contratante_nome}
                onChange={handleChange}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contato do Contratante</label>
              <input
                type="text"
                name="contratante_contato"
                value={formData.contratante_contato}
                onChange={handleChange}
                placeholder="Ex: (11) 98765-4321"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Observações</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações Adicionais</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={4}
              placeholder="Informações adicionais sobre o evento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            ></textarea>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap justify-end gap-3 mt-8">
          <Link 
            href="/dashboard/dj/agenda" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md transition-colors ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {submitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
