"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { app } from "@/lib/firebaseConfig";
// Versão Simplificada: Importar apenas doc e getDoc
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useRouter } from "next/navigation";

const auth = getAuth(app);
const db = getFirestore(app);

// Interface expandida para incluir todos os campos relevantes de DJs
export type PerfilUsuario = {
  uid: string;
  email: string;
  nome: string;
  role: "admin" | "dj";
  status?: string;
  createdAt?: Date;
  updated_at?: Date;
  // Campos específicos para DJs
  agencia?: string;
  banco?: string;
  conta?: string;
  cpf?: string;
  percentual?: number;
  percentual_padrao?: number;
  telefone?: string;
  tipo_conta?: string;
};

type AuthContextType = {
  user: User | null;
  perfil: PerfilUsuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isDJ: boolean;
  router: ReturnType<typeof useRouter>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true); // Inicia carregamento

      if (firebaseUser) {
        try {
          // Versão Simplificada: Buscar perfil diretamente pelo ID (UID)
          console.log(`[AuthContext] Buscando perfil por ID: ${firebaseUser.uid}`);
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // Construir o perfil completo com todos os campos
            const perfilCompleto: PerfilUsuario = {
              uid: firebaseUser.uid,
              email: userData.email || firebaseUser.email || "",
              nome: userData.nome || "",
              role: userData.role || "dj",
              status: userData.status || "ativo",
              createdAt: userData.createdAt?.toDate(),
              updated_at: userData.updated_at?.toDate(),
              agencia: userData.agencia,
              banco: userData.banco,
              conta: userData.conta,
              cpf: userData.cpf,
              percentual: userData.percentual,
              percentual_padrao: userData.percentual_padrao,
              telefone: userData.telefone,
              tipo_conta: userData.tipo_conta
            };
            
            setPerfil(perfilCompleto);
            console.log("✅ Perfil carregado com sucesso (ID = UID):");
          } else {
            console.warn("⚠️ Perfil não encontrado no Firestore para o UID (ID = UID):");
            setPerfil(null);
          }
        } catch (error) {
          console.error("❌ Erro ao buscar perfil:", error);
          setPerfil(null);
        }
      } else {
        // Se não há firebaseUser (logout)
        setPerfil(null);
      }

      setLoading(false); // Finaliza carregamento
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("❌ Erro no login:", error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error: any) {
      console.error("❌ Erro no logout:", error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        loading,
        login,
        logout,
        isAdmin: perfil?.role === "admin" || false,
        isDJ: perfil?.role === "dj" || false,
        router
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return context;
}

