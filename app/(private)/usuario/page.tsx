"use client";

import { FaPlusSquare, FaTrash, FaEdit, FaFilePdf, FaSync , FaListUl, FaCaretDown, FaFilter } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function Login() {
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // === CLASSES REUTILIZÁVEIS ===
  const BTN =
    "h-12 px-4 inline-flex items-center justify-center gap-2 rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";

  const BTN_SQUARE =
    "h-12 w-12 inline-flex items-center justify-center rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";

  type Usuario = {
    id: string;
    nome: string;
    email: string;
    senha?: string;
  };

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const handleSubmit = async () => {
    try {
      const response = await fetch("${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/usuarios", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      if (!response.ok) {
        let msg = `Erro HTTP: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) msg = errJson.message;
        } catch {}
        throw new Error(msg);
      }

      try { await response.json(); } catch {}

      setNome(""); setEmail(""); setSenha("");
      setFormularioAberto(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao criar usuário:", msg);
      alert(msg || "Erro ao criar usuário");
    }
  };

  async function listarUsuarios(): Promise<any[]> {
    try {
      const response = await fetch("http://localhost:8000/usuarios", {
        method: "GET",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let msg = `Erro HTTP: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) msg = errJson.message;
        } catch {}
        throw new Error(msg);
      }

      const text = await response.text();
      if (!text) return [];
      return JSON.parse(text);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao listar usuários:", msg);
      return [];
    }
  }

  useEffect(() => {
    (async () => {
      const usuarios = await listarUsuarios();
      setUsuarios(Array.isArray(usuarios) ? usuarios : []);
    })();
  }, []);

  async function deletarUsuario(usuario_id: any) {
    try {
      const response = await fetch(`http://localhost:8000/usuarios/${usuario_id}`, {
        method: "DELETE",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let msg = `Erro HTTP: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) msg = errJson.message;
        } catch {}
        throw new Error(msg);
      }

      try { await response.json(); } catch {}
      alert("Usuário deletado com sucesso!");
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao deletar usuário:", msg);
      alert(msg || "Erro ao deletar usuário");
      return false;
    }
  }

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Cadastro de Usuários</h3>

          <div className="flex gap-6">
            {/* Novo */}
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_new_menu"
                className={BTN_SQUARE}
                title="Novo"
                onClick={() => setFormularioAberto(!formularioAberto)}
              >
                <FaPlusSquare className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">NOVO</span>
            </div>

            {/* Lixeira */}
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_trash_menu"
                className={BTN_SQUARE}
                title="Lixeira"
              >
                <FaTrash className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">LIXEIRA</span>
            </div>
          </div>
        </div>

        {/* Cadastro */}
        {formularioAberto && (
          <div id="screen" className="mb-10">
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block font-medium">Name</label>
                    <input
                      type="text"
                      id="name"
                      placeholder="Name"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block font-medium">Email address</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block font-medium">Password</label>
                    <input
                      type="password"
                      id="password"
                      placeholder="Password"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" className={BTN} onClick={handleSubmit}>Submit</button>
                    <button type="button" className="h-12 px-6 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Listagem */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">

              {/* Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                {/* Filtro */}
                <button className={BTN}>
                  <FaFilter />
                  <span>Filtro Avançado</span>
                </button>

                {/* Busca */}
                <div className="flex flex-1 max-w-xl mx-2">
                  <input
                    type="text"
                    className="flex-1 h-12 border border-gray-300 rounded-l px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar"
                  />
                  <button className={`${BTN} rounded-l-none`}>Pesquisar</button>
                </div>

                {/* PDF e recarregar */}
                <div className="flex items-center gap-2">
                  <button className={BTN}>
                    <FaFilePdf />
                    <span>PDF</span>
                  </button>
                  <button className={BTN}>
                    <FaSync />
                  </button>

                  {/* Paginação */}
                  <div className="relative">
                    <button className={BTN}>
                      <span className="mr-1">10</span>
                      <FaCaretDown />
                    </button>
                  </div>

                  {/* Colunas */}
                  <div className="relative">
                    <button className={BTN}>
                      <FaListUl className="mr-1" />
                      <FaCaretDown />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="p-2 w-8">
                        <input type="checkbox" />
                      </th>
                      <th className="p-2 text-start">Nome</th>
                      <th className="p-2 text-start">Email</th>
                      <th className="p-2 text-center" style={{ width: "100px" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-4">
                          <input type="checkbox" />
                        </td>
                        <td className="p-4">{usuario.nome}</td>
                        <td className="p-4">{usuario.email}</td>
                        <td className="p-4 text-center">
                          <button className="mx-1 h-10 w-10 inline-flex items-center justify-center rounded" title="Editar">
                            <FaEdit style={{ color: "rgb(0, 152, 196)", minHeight: "24px", minWidth: "24px"}}/>
                          </button>
                          <button
                            className="mx-1 h-10 w-10 inline-flex items-center justify-center rounded"
                            title="Lixeira"
                            onClick={() => deletarUsuario(usuario.id)}
                          >
                            <FaTrash style={{ color: "rgb(0, 152, 196)", minHeight: "24px", minWidth: "24px"}}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
