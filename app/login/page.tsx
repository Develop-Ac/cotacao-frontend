"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import logo from '../logo.svg';
import Image from 'next/image';

export default function Login() {
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await fetch('https://intranetbackend.acacessorios.local/login', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ codigo, senha }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('auth', 'true');
        localStorage.setItem('userData', JSON.stringify(data));
        router.push('/');
      } else {
        alert(data.message || 'Login inválido');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao conectar ao servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
      <div className="card elevated overflow-hidden w-full max-w-5xl">
        <div className="flex flex-col md:flex-row min-h-[520px]">
          {/* Left gradient panel (desktop) */}
          <div className="hidden md:flex md:w-1/2 gradient-header items-center justify-center p-10">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Image src={logo.src} alt="logo" width={200} height={100} />
              </div>
              <h2 className="text-2xl font-bold leading-snug">Bem-vindo ao Intranet</h2>
              <p className="opacity-90 mt-2">Acesse com suas credenciais</p>
            </div>
          </div>
          {/* Right form panel */}
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-white">
            <div className="w-full max-w-sm">
              <div className="md:hidden flex justify-center mb-6">
                <Image src={logo.src} alt="logo" width={200} height={100} />
              </div>
              <h4 className="text-xl font-semibold mb-1 text-center" style={{ color: "var(--primary-800)" }}>Vamos iniciar</h4>
              <p className="text-gray-500 text-center mb-6">Entre com sua conta</p>
              <form className="flex flex-col gap-4">
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  placeholder="Código de Usuário"
                  className="rounded-lg border border-gray-300 px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-600)]"
                />
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Senha"
                  className="rounded-lg border border-gray-300 px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-600)]"
                />
                <button
                  type="button"
                  onClick={handleLogin}
                  className="btn-primary w-full rounded-xl mt-2 shadow-sm"
                >
                  Entrar
                </button>
              </form>
              {/* <div className="flex justify-between items-center mt-4">
                <label className="flex items-center text-gray-500 text-sm">
                  <input type="checkbox" className="form-checkbox mr-2 accent-[color:var(--primary-600)]" />
                  Manter-me conectado
                </label>
                <a href="#" onClick={() => alert('Recuperar senha')} className="text-[color:var(--primary-600)] hover:underline text-sm">
                  Esqueceu a senha?
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

