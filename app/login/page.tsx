"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import logo from '../logo.svg';
import Image from 'next/image';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await fetch('${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/login', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, senha }), // senha deve ter o mesmo nome que o backend espera
      });

      const data = await response.json();

      console.log(data.success)

      if (data.success) {
        // Login bem-sucedido → salva no localStorage
        localStorage.setItem('auth', 'true');
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
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
  <div className="bg-white shadow rounded-lg px-8 py-10" style={{ minWidth: 340, maxWidth: 400 }}>
    <div className="flex justify-center mb-6">
      <Image
        src={logo.src}
        alt="icon"
        width={240}
        height={120}
        className="w-3/4"
      />
    </div>
    <h4 className="text-xl font-semibold mb-2 text-center">Olá! Vamos iniciar.</h4>
    <h6 className="text-gray-500 font-light mb-6 text-center">Entre com sua conta</h6>
    <form className="flex flex-col items-center gap-3">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="rounded border border-gray-300 px-4 py-3 text-base w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        placeholder="Senha"
        className="rounded border border-gray-300 px-4 py-3 text-base w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={handleLogin}
        className="w-80 bg-blue-600 hover:bg-blue-700 text-white rounded py-3 font-semibold text-base mt-2 shadow-sm transition"
      >
        Entrar
      </button>
    </form>
    <div className="flex justify-between items-center mt-4 w-80 mx-auto">
      <label className="flex items-center text-gray-500 text-sm">
        <input
          type="checkbox"
          className="form-checkbox mr-2 accent-blue-600"
        />
        Manter-me conectado
      </label>
      <a href="#" onClick={() => alert('Recuperar senha')} className="text-blue-600 hover:underline text-sm">
        Esqueceu a senha?
      </a>
    </div>
  </div>
</div>


  );
}
