"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import logo from "../logo.svg";
import Image from "next/image";
import { serviceUrl } from "@/lib/services";
// import { writeUserToLocalStorage } from "../lib/user"; // Removido na migração v2


export default function Login() {
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    if (!codigo || !senha) {
      alert("Informe código e senha.");
      return;
    }

    setLoading(true);
    try {
      // Chama a nossa rota de API que define o cookie
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, senha }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sucesso! Cookie já definido.
        // Opcional: Salvar dados não sensíveis no context se necessário, 
        // mas a persistência principal agora é o cookie.

        // Disparar evento apenas para atualizar componentes que ouvem mudanças (se houver)
        // window.dispatchEvent(new Event("auth:updated")); 

        router.push("/");
        router.refresh(); // Força recarregamento para middleware/server components pegarem o cookie
      } else {
        alert(data?.message || "Login inválido");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDownCodigo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const handleKeyDownSenha = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!loading) handleLogin();
    }
  };

  // Mapeamento dos meses para os arquivos de imagem
  const backgroundImages = [
    "JANEIRO.png", "FEVEREIRO.png", "MARÇO.png", "ABRIL.png", "MAIO.png", "JUNHO.png",
    "JULHO.png", "AGOSTO.png", "SETEMBRO.png", "OUTUBRO.png", "NOVEMBRO.png", "DEZEMBRO.png"
  ];

  const currentMonthIndex = new Date().getMonth();
  const currentBackgroundImage = `/images/fundo/${backgroundImages[currentMonthIndex]}`;

  /* ------------------- Logout transition logic ------------------- */
  const [showLogoutFade, setShowLogoutFade] = useState(false);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    // Se veio do logout (?logout=true)
    if (searchParams && searchParams.get("logout") === "true") {
      setShowLogoutFade(true);
      // Remove o param da URL para nao ficar lá pra sempre
      router.replace("/login");

      // Inicia o fade-out do branco
      const timer = setTimeout(() => {
        setShowLogoutFade(false);
      }, 800); // tempo para o branco sumir
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={currentBackgroundImage}
          alt="Background"
          fill
          className="object-fill opacity-100"
          priority
          quality={100}
        />
        {/* Overlay for better readability if needed */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* 
        Overlay branco de transição (Logout -> Login).
        Ele começa com opacity-100 (tudo branco) e faz transition para opacity-0.
        Pointer-events-none para não bloquear cliques quando estiver transparente.
      */}
      <div
        className={`fixed inset-0 z-[99999] bg-white pointer-events-none transition-opacity duration-1000 ease-out ${showLogoutFade ? "opacity-100" : "opacity-0"
          }`}
      />

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6">
            <Image src={logo.src} alt="Logo" width={180} height={90} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Bem-vindo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Entre com suas credenciais para acessar a Intranet Corporativa
          </p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Código de Usuário
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={handleKeyDownCodigo}
              placeholder="Digite seu código"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 outline-none"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Senha
            </label>
            <input
              ref={passwordRef}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={handleKeyDownSenha}
              placeholder="Digite sua senha"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 outline-none"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
