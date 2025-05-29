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
// CORREÇÃO: Importar doc, getDoc, collection, query, where, getDocs
import { doc, getDoc, collection, query, where, getDocs, getFirestore, DocumentSnapshot, DocumentData } from "firebase/firestore";
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
      setLoading(true); // Start loading when auth state changes

      if (firebaseUser) {
        let userDocSnap: DocumentSnapshot<DocumentData> | null = null;
        let userData: DocumentData | null = null;

        try {
          // CORREÇÃO HÍBRIDA: Tentar buscar pelo ID do documento primeiro (usuários antigos)
          console.log(`[AuthContext] Tentando buscar perfil por ID: ${firebaseUser.uid}`);
          const userRefById = doc(db, "users", firebaseUser.uid);
          userDocSnap = await getDoc(userRefById);

          if (userDocSnap.exists()) {
            console.log("[AuthContext] Perfil encontrado por ID.");
            userData = userDocSnap.data();
          } else {
            // Se não encontrou por ID, tentar buscar pelo campo uid (usuários novos)
            console.log(`[AuthContext] Perfil não encontrado por ID, tentando buscar por campo uid: ${firebaseUser.uid}`);
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "==", firebaseUser.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              console.log("[AuthContext] Perfil encontrado por campo uid.");
              // Assume que uid é único, pega o primeiro documento encontrado
              userDocSnap = querySnapshot.docs[0];
              userData = userDocSnap.data();
            } else {
              console.warn("⚠️ Perfil não encontrado no Firestore nem por ID nem por campo uid:", firebaseUser.uid);
            }
          }

          // Se encontrou userData por qualquer método
          if (userData) {
            const perfilCompleto: PerfilUsuario = {
              uid: firebaseUser.uid, // Garante que o uid do Auth seja usado
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
            console.log("✅ Perfil carregado com sucesso:", perfilCompleto.role);
          } else {
            // Se não encontrou por nenhum método
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

      setLoading(false); // Finish loading after attempting to fetch profile or if logged out
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

