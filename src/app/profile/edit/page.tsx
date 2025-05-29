"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, perfil } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    especialidades: "",
    bio: "",
  });

  // Carregar dados do perfil
  useEffect(() => {
    if (user && perfil) {
      setFormData({
        nome: perfil.nome || "",
        telefone: perfil.telefone || "",
        especialidades: perfil.especialidades ? perfil.especialidades.join(", ") : "",
        bio: perfil.bio || "",
      });
      setLoading(false);
    } else if (!user) {
      // Redirecionar para login se não estiver autenticado
      router.push("/login");
    }
  }, [user, perfil, router]);

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setSubmitting(true);

    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar dados do perfil
      const profileData: any = {
        nome: formData.nome,
        telefone: formData.telefone,
        bio: formData.bio,
        updated_at: new Date(),
      };

      // Processar especialidades (se houver)
      if (formData.especialidades.trim()) {
        profileData.especialidades = formData.especialidades
          .split(",")
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }

      // Atualizar perfil no Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, profileData);

      setMensagem({ 
        tipo: 'sucesso', 
        texto: 'Perfil atualizado com sucesso!' 
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        // Redirecionar com base no perfil
        if (perfil?.role === "admin") {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard/dj");
        }
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Editar Perfil</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Editar Perfil</h1>

      {mensagem && (
        <div className={`mb-6 p-4 rounded-md ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {perfil?.role === "dj" && (
            <div>
              <label className="block text-gray-700 mb-1">Especialidades (separadas por vírgula)</label>
              <textarea
                name="especialidades"
                value={formData.especialidades}
                onChange={handleChange}
                rows={3}
                placeholder="Ex: Hip Hop, Eletrônica, Funk, Pop"
                className="w-full border border-gray-300 rounded px-3 py-2"
              ></textarea>
            </div>
          )}

          <div>
            <label className="block text-gray-700 mb-1">Biografia/Descrição</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Conte um pouco sobre você..."
              className="w-full border border-gray-300 rounded px-3 py-2"
            ></textarea>
          </div>

          <div className="pt-4 bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600 text-sm mb-2">
              <strong>Email:</strong> {user?.email} (não pode ser alterado)
            </p>
            <p className="text-gray-600 text-sm">
              <strong>Perfil:</strong> {perfil?.role === "admin" ? "Administrador" : "DJ"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Link
            href={perfil?.role === "admin" ? "/dashboard/admin" : "/dashboard/dj"}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 rounded transition ${
              submitting
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {submitting ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
