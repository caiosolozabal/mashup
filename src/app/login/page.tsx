"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, perfil, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    try {
      await login(email, senha);
    } catch (err: any) {
      setErro("Email ou senha inválidos.");
      console.error("Erro ao logar:", err);
    }
  };

  // Redireciona após login com base no perfil
  useEffect(() => {
  if (!loading && user && perfil) {
    if (perfil.role === "admin") {
      router.push("/dashboard/admin");
    } else {
      router.push("/dashboard/dj");
    }
  }
}, [user, perfil, loading, router]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {erro && <p className="text-red-500 mb-4 text-center">{erro}</p>}

        <label className="block mb-2">
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          />
        </label>

        <label className="block mb-4">
          Senha:
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
