"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
// CORREÇÃO: Importar doc, setDoc, updateDoc
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { DJ } from "@/lib/eventService";

export default function ManageUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<DJ | null>(null);
  
  // Formulário para novo usuário
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
    role: "dj",
    status: "ativo",
    telefone: "",
    percentual: 70,
    percentual_padrao: 70,
    agencia: "",
    banco: "",
    conta: "",
    tipo_conta: "corrente",
    cpf: ""
  });

  // Carregar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: DJ[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          fetchedUsers.push({
            id: doc.id,
            nome: userData.nome || userData.email || "Usuário sem nome",
            email: userData.email || "",
            role: userData.role || "dj",
            status: userData.status || "ativo",
            telefone: userData.telefone || "",
            percentual: userData.percentual || 70,
            percentual_padrao: userData.percentual_padrao || 70,
            agencia: userData.agencia || "",
            banco: userData.banco || "",
            conta: userData.conta || "",
            tipo_conta: userData.tipo_conta || "corrente",
            cpf: userData.cpf || ""
          });
        });
        
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        setError("Falha ao carregar a lista de usuários.");
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Converter valores numéricos
    if (type === "number") {
      setFormData({
        ...formData,
        [name]: value === "" ? "" : Number(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Criar novo usuário
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      setLoading(true);
      
      // Verificar se email já existe
      const emailQuery = query(collection(db, "users"), where("email", "==", formData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        throw new Error("Este email já está em uso.");
      }
      
      // Criar usuário no Firebase Authentication
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const uid = userCredential.user.uid;
      
      // CORREÇÃO: Salvar dados do usuário no Firestore usando o UID como ID do documento
      const userDocRef = doc(db, "users", uid); // Cria a referência com o UID
      await setDoc(userDocRef, { // Usa setDoc para definir o documento com o ID específico
        uid: uid, // Ainda salva o uid como campo para consistência ou futuras queries
        email: formData.email,
        nome: formData.nome,
        role: formData.role,
        status: formData.status,
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        // Campos específicos para DJs
        ...(formData.role === "dj" && {
          telefone: formData.telefone,
          percentual: formData.percentual,
          percentual_padrao: formData.percentual_padrao,
          agencia: formData.agencia,
          banco: formData.banco,
          conta: formData.conta,
          tipo_conta: formData.tipo_conta,
          cpf: formData.cpf
        })
      });
      
      setSuccess("Usuário criado com sucesso!");
      setShowForm(false);
      
      // Resetar formulário
      setFormData({
        email: "",
        senha: "",
        nome: "",
        role: "dj",
        status: "ativo",
        telefone: "",
        percentual: 70,
        percentual_padrao: 70,
        agencia: "",
        banco: "",
        conta: "",
        tipo_conta: "corrente",
        cpf: ""
      });
      
      // Recarregar lista de usuários
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers: DJ[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        fetchedUsers.push({
          id: doc.id,
          nome: userData.nome || userData.email || "Usuário sem nome",
          email: userData.email || "",
          role: userData.role || "dj",
          status: userData.status || "ativo",
          telefone: userData.telefone || "",
          percentual: userData.percentual || 70,
          percentual_padrao: userData.percentual_padrao || 70,
          agencia: userData.agencia || "",
          banco: userData.banco || "",
          conta: userData.conta || "",
          tipo_conta: userData.tipo_conta || "corrente",
          cpf: userData.cpf || ""
        });
      });
      
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      setError(err.message || "Falha ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  // Editar usuário existente
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setError("");
    setSuccess("");
    
    try {
      setLoading(true);
      
      // Atualizar dados do usuário no Firestore
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        nome: formData.nome,
        role: formData.role,
        status: formData.status,
        updated_at: serverTimestamp(),
        // Campos específicos para DJs
        ...(formData.role === "dj" && {
          telefone: formData.telefone,
          percentual: formData.percentual,
          percentual_padrao: formData.percentual_padrao,
          agencia: formData.agencia,
          banco: formData.banco,
          conta: formData.conta,
          tipo_conta: formData.tipo_conta,
          cpf: formData.cpf
        })
      });
      
      setSuccess("Usuário atualizado com sucesso!");
      setEditingUser(null);
      
      // Recarregar lista de usuários
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers: DJ[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        fetchedUsers.push({
          id: doc.id,
          nome: userData.nome || userData.email || "Usuário sem nome",
          email: userData.email || "",
          role: userData.role || "dj",
          status: userData.status || "ativo",
          telefone: userData.telefone || "",
          percentual: userData.percentual || 70,
          percentual_padrao: userData.percentual_padrao || 70,
          agencia: userData.agencia || "",
          banco: userData.banco || "",
          conta: userData.conta || "",
          tipo_conta: userData.tipo_conta || "corrente",
          cpf: userData.cpf || ""
        });
      });
      
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Erro ao atualizar usuário:", err);
      setError(err.message || "Falha ao atualizar usuário.");
    } finally {
      setLoading(false);
    }
  };

  // Iniciar edição de usuário
  const startEditingUser = async (user: DJ) => {
    try {
      setLoading(true);
      
      // Buscar dados completos do usuário
      const userRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        setFormData({
          email: userData.email || "",
          senha: "", // Não é possível recuperar a senha
          nome: userData.nome || "",
          role: userData.role || "dj",
          status: userData.status || "ativo",
          telefone: userData.telefone || "",
          percentual: userData.percentual || 70,
          percentual_padrao: userData.percentual_padrao || 70,
          agencia: userData.agencia || "",
          banco: userData.banco || "",
          conta: userData.conta || "",
          tipo_conta: userData.tipo_conta || "corrente",
          cpf: userData.cpf || ""
        });
        
        setEditingUser(user);
      } else {
        throw new Error("Usuário não encontrado.");
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do usuário:", err);
      setError(err.message || "Falha ao carregar dados do usuário.");
    } finally {
      setLoading(false);
    }
  };

  // Cancelar edição/criação
  const handleCancel = () => {
    setEditingUser(null);
    setShowForm(false);
    setFormData({
      email: "",
      senha: "",
      nome: "",
      role: "dj",
      status: "ativo",
      telefone: "",
      percentual: 70,
      percentual_padrao: 70,
      agencia: "",
      banco: "",
      conta: "",
      tipo_conta: "corrente",
      cpf: ""
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento de Usuários</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {!showForm && !editingUser && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          Novo Usuário
        </button>
      )}
      
      {(showForm || editingUser) && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingUser ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          
          <form onSubmit={editingUser ? handleEditUser : handleCreateUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email (apenas para novos usuários) */}
              {!editingUser && (
                <div>
                  <label className="block text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}
              
              {/* Senha (apenas para novos usuários) */}
              {!editingUser && (
                <div>
                  <label className="block text-gray-700 mb-2">Senha *</label>
                  <input
                    type="password"
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}
              
              {/* Nome */}
              <div>
                <label className="block text-gray-700 mb-2">Nome *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              {/* Função */}
              <div>
                <label className="block text-gray-700 mb-2">Função *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="dj">DJ</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-gray-700 mb-2">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              
              {/* Campos específicos para DJs */}
              {formData.role === "dj" && (
                <>
                  {/* Telefone */}
                  <div>
                    <label className="block text-gray-700 mb-2">Telefone</label>
                    <input
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Percentual */}
                  <div>
                    <label className="block text-gray-700 mb-2">Percentual (%)</label>
                    <input
                      type="number"
                      name="percentual"
                      value={formData.percentual}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Percentual Padrão */}
                  <div>
                    <label className="block text-gray-700 mb-2">Percentual Padrão (%)</label>
                    <input
                      type="number"
                      name="percentual_padrao"
                      value={formData.percentual_padrao}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* CPF */}
                  <div>
                    <label className="block text-gray-700 mb-2">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Banco */}
                  <div>
                    <label className="block text-gray-700 mb-2">Banco</label>
                    <input
                      type="text"
                      name="banco"
                      value={formData.banco}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Agência */}
                  <div>
                    <label className="block text-gray-700 mb-2">Agência</label>
                    <input
                      type="text"
                      name="agencia"
                      value={formData.agencia}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Conta */}
                  <div>
                    <label className="block text-gray-700 mb-2">Conta</label>
                    <input
                      type="text"
                      name="conta"
                      value={formData.conta}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Tipo de Conta */}
                  <div>
                    <label className="block text-gray-700 mb-2">Tipo de Conta</label>
                    <select
                      name="tipo_conta"
                      value={formData.tipo_conta}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="corrente">Corrente</option>
                      <option value="poupanca">Poupança</option>
                      <option value="pagamento">Pagamento</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? "Salvando..." : (editingUser ? "Atualizar Usuário" : "Criar Usuário")}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Lista de Usuários</h2>
        
        {loading && !users.length ? (
          <p>Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p>Nenhum usuário encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
