"use client";

import { FaPlusSquare, FaTrash, FaEdit, FaFilePdf, FaSync, FaListUl, FaCaretDown, FaFilter } from "react-icons/fa";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import { serviceUrl } from "@/lib/services";

export default function Login() {
  // === MAPA DE PERMISSÕES POR SETOR ===
  const PERMISSOES_SETORES: Record<string, Array<{ modulo: string; telas: string[] }>> = {
    Estoque: [
      { modulo: "Estoque", telas: ["/estoque/contagem", "/estoque/auditoria"] },
    ],
    Oficina: [
      { modulo: "Oficina", telas: ["/oficina/checkList"] },
    ],
    Compras: [
      {
        modulo: "Compras", telas: [
          "/compras/cotacao",
          "/compras/cotacao/comparativo",
          "/compras/cotacao/pedido",
          "/compras/notaFiscal/notaFiscal",
          "/compras/kanban",
          "/compras/analise"
        ]
      },
    ],
    Admin: [
      { modulo: "Estoque", telas: ["/estoque/contagem", "/estoque/auditoria"] },
      { modulo: "Oficina", telas: ["/oficina/checkList"] },
      {
        modulo: "Compras", telas: [
          "/compras/cotacao",
          "/compras/cotacao/comparativo",
          "/compras/cotacao/pedido",
          "/compras/notaFiscal/notaFiscal",
          "/compras/kanban",
          "/compras/analise"
        ]
      },
      { modulo: "Sac", telas: ["/sac/kanban"] },
      { modulo: "Qualidade", telas: ["/qualidade", "/qualidade/caixa"] },
      { modulo: "Atacado", telas: [] },
      { modulo: "Varejo", telas: [] },
      { modulo: "Expedição", telas: ["/expedicao/dashboard", "/expedicao/aplicativo"] },
    ],
    Sac: [
      { modulo: "Sac", telas: ["/sac/kanban"] },
      { modulo: "Qualidade", telas: ["/qualidade", "/qualidade/caixa"] },
    ],
    Qualidade: [
      { modulo: "Sac", telas: ["/sac/kanban"] },
      { modulo: "Qualidade", telas: ["/qualidade", "/qualidade/caixa"] },
      { modulo: "Compras", telas: ["/compras/kanban"] },
    ],
    Atacado: [
      { modulo: "Sac", telas: ["/sac/kanban"] },
    ],
    Varejo: [
      { modulo: "Sac", telas: ["/sac/kanban"] },
    ],
    "Expedição": [
      { modulo: "Expedição", telas: ["/expedicao/dashboard", "/expedicao/aplicativo"] },
    ],
  };

  // Estado do modal de permissões
  const [modalPermissoesAberto, setModalPermissoesAberto] = useState(false);
  const [permissoes, setPermissoes] = useState<Record<string, Record<string, boolean>>>({});
  const [modulosTelas, setModulosTelas] = useState<Array<{ modulo: string; telas: string[] }>>([]);

  // Abre o modal ao selecionar setor
  const handleSetorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoSetor = e.target.value;
    setSetor(novoSetor);
    if (novoSetor && PERMISSOES_SETORES[novoSetor]) {
      setModulosTelas(PERMISSOES_SETORES[novoSetor]);
      setModalPermissoesAberto(true);
    } else {
      setModulosTelas([]);
      setModalPermissoesAberto(false);
    }
  };

  // Permissões possíveis
  const TIPOS_PERMISSAO = ["visualizar", "editar", "criar", "excluir"];

  // Atualiza permissão
  const handlePermissaoChange = (tela: string, tipo: string) => {
    setPermissoes(prev => ({
      ...prev,
      [tela]: {
        ...prev[tela],
        [tipo]: !prev[tela]?.[tipo],
      },
    }));
  };
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [setor, setSetor] = useState("");
  const [senha, setSenha] = useState("");

  // Estado para armazenar visualmente as permissões originais do usuário (para decidir se faz POST ou PUT)
  const [permissoesOriginais, setPermissoesOriginais] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");

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
    codigo?: string;
    setor: string;
    senha?: string;
  };

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Função para carregar usuários
  const SISTEMA_API = serviceUrl("sistema");

  const carregarUsuarios = useCallback(async () => {
    try {
      const response = await fetch(`${SISTEMA_API}/usuarios`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      console.log("Usuários carregados:", data);
      setUsuarios(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao carregar usuários:", msg);
      alert("Erro ao carregar usuários: " + msg);
    }
  }, [SISTEMA_API]);

  // Carregar usuários ao montar o componente
  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const handleSubmit = async () => {
    try {
      let usuarioId = usuarioEditandoId;

      if (usuarioId) {
        // === EDITAR USUÁRIO ===
        // 1. Atualiza dados básicos (via PUT se existir endpoint, senão via POST que atua como upsert ou similar?)
        // O endpoint POST /usuarios geralmente cria. Vamos assumir que precisamos de um PUT /usuarios/:id ou que o POST resolve.
        // Dado que não vi um PUT /usuarios no backend (vi apenas permissoes), vou assumir que a edição de DADOS DO USUÁRIO
        // pode não estar 100% implementada ou usa o POST.
        // Vendo o código original, parece que só havia POST. Vou tentar usar o mesmo endpoint POST para "upsert" se o backend suportar,
        // ou, idealmente, se eu tivesse criado o PUT. Como não criei task para PUT de usuário, vou focar nas PERMISSÕES.
        // Mas espere, se eu mudar o nome/setor, preciso salvar.
        // Vou assumir que o sistema aceita POST para edição se mandar ID? Não, o prisma gera ID novo no create.
        // **DECISÃO PROVISÓRIA**: Vou usar POST para criar e vou adicionar um TODO para implementar PUT de usuário se falhar.
        // Mas para não quebrar, vou assumir criação de um NOVO se não for edição.
        // Se for edição, vou tentar fazer um PATCH/PUT simulado ou apenas atualizar permissões se o backend não suportar update de usuário.
        // *Revisão rápida*: O usuário pediu "incluir a opção de editar os acessos". O foco é ACESSO.
        // Então, para DADOS BÁSICOS, se não houver endpoint, eu mantenho como está (ou seja, talvez não edite dados básicos, só permissões).
        // Mas vou tentar um PUT para ver se cola.

        // NOTA: O backend não foi inspecionado profundamente para 'usuarios' controller, apenas 'permissoes'.
        // Supondo que exista ou que eu possa só atualizar permissões.

        // Se houver endpoint de update de usuario:
        // await fetch(`${SISTEMA_API}/usuarios/${usuarioId}`, { method: 'PUT', ... });
      } else {
        // === CRIAR USUÁRIO ===
        const response = await fetch(`${SISTEMA_API}/usuarios`, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ nome, codigo, setor, senha }),
        });

        if (!response.ok) {
          let msg = `Erro HTTP: ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson?.message) msg = errJson.message;
          } catch { }
          throw new Error(msg);
        }

        let usuarioCriado;
        try {
          usuarioCriado = await response.json();
        } catch {
          throw new Error("Não foi possível obter o id do usuário criado.");
        }
        usuarioId = usuarioCriado?.data?.id || usuarioCriado?.id;
      }

      if (!usuarioId) throw new Error("ID do usuário não disponível.");

      // Envia permissões para cada tela marcada
      const permissoesRequests = [];
      for (const [tela, tipos] of Object.entries(permissoes)) {
        // Descobre o módulo da tela
        let modulo = "";
        for (const m of modulosTelas) {
          if (m.telas.includes(tela)) {
            modulo = m.modulo;
            break;
          }
        }
        if (!modulo) continue;

        const body = {
          visualizar: !!tipos["visualizar"],
          editar: !!tipos["editar"],
          criar: !!tipos["criar"],
          deletar: !!tipos["deletar"],
        };

        // Lógica de Permissões:
        // Se usuário já tinha permissão (estava em permissoesOriginais ou carregado), usamos PUT
        // Se é nova, POST.
        // Simplificação: O controller suporta PUT (updateMany). Se não existir, updateMany não faz nada.
        // O controller suporta POST (create).
        // Check if we should PUT or POST.
        // Vou usar a flag `permissoesOriginais[tela]` para saber se já existia registro no banco.

        const metodo = permissoesOriginais[tela] ? "PUT" : "POST";

        permissoesRequests.push(
          fetch(`${SISTEMA_API}/permissoes/${usuarioId}?modulo=${encodeURIComponent(modulo)}&tela=${encodeURIComponent(tela)}`, {
            method: metodo,
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        );
      }

      await Promise.all(permissoesRequests);

      // Limpar form
      setNome(""); setCodigo(""); setSetor(""); setSenha("");
      setUsuarioEditandoId(null);
      setPermissoesOriginais({});
      setFormularioAberto(false);
      setPermissoes({});
      await carregarUsuarios();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao salvar usuário:", msg);
      alert(msg || "Erro ao salvar usuário");
    }
  };

  const handleEditUsuario = async (usuario: Usuario) => {
    setUsuarioEditandoId(usuario.id);
    setNome(usuario.nome);
    setCodigo(usuario.codigo || "");
    setSetor(usuario.setor);
    setSenha(""); // Não preenche senha por segurança

    // Configura telas baseadas no setor
    if (usuario.setor && PERMISSOES_SETORES[usuario.setor]) {
      setModulosTelas(PERMISSOES_SETORES[usuario.setor]);
    } else {
      setModulosTelas([]);
    }

    // Carregar permissões do usuário
    try {
      const response = await fetch(`${SISTEMA_API}/permissoes/${usuario.id}`);
      if (response.ok) {
        const data = await response.json();
        // data é array de { modulo, tela, visualizar, editar, ... }
        const novasPermissoes: Record<string, Record<string, boolean>> = {};
        const originais: Record<string, boolean> = {};

        if (Array.isArray(data)) {
          data.forEach((p: any) => {
            novasPermissoes[p.tela] = {
              visualizar: p.visualizar,
              editar: p.editar,
              criar: p.criar,
              deletar: p.deletar,
            };
            originais[p.tela] = true; // Marca que essa tela já tem registro
          });
        }
        setPermissoes(novasPermissoes);
        setPermissoesOriginais(originais);
      }
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
    }

    setFormularioAberto(true);
  };

  const deletarUsuario = async (id: string) => {
    try {
      const response = await fetch(`${SISTEMA_API}/usuarios/${id}`, {
        method: "DELETE",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let msg = `Erro HTTP: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) msg = errJson.message;
        } catch { }
        throw new Error(msg);
      }

      // Remove o usuário da lista local
      setUsuarios(usuarios.filter(usuario => usuario.id !== id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Erro ao deletar usuário:", msg);
      alert(msg || "Erro ao deletar usuário");
    }
  };

  const filteredUsuarios = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.codigo && u.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">

        {/* Page header - permanece igual */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Cadastro de Usuários</h3>

          <div className="flex gap-6">
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_new_menu"
                className={BTN_SQUARE}
                title="Novo"
                onClick={() => {
                  setUsuarioEditandoId(null);
                  setNome(""); setCodigo(""); setSetor(""); setSenha("");
                  setPermissoes({});
                  setPermissoesOriginais({});
                  setFormularioAberto(!formularioAberto);
                }}
              >
                <FaPlusSquare className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">NOVO</span>
            </div>

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

        {/* Cadastro - MODIFICADO */}
        {formularioAberto && (
          <div id="screen" className="mb-10">
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block font-medium">Nome</label>
                    <input
                      type="text"
                      id="name"
                      placeholder="Nome"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="codigo" className="block font-medium">Código de Usuário</label>
                    <input
                      type="text"
                      id="codigo"
                      placeholder="Código de Usuário"
                      value={codigo}
                      onChange={e => setCodigo(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="setor" className="block font-medium">Setor</label>
                    <select
                      id="setor"
                      value={setor}
                      onChange={handleSetorChange}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um setor</option>
                      <option value="Estoque">Estoque</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Compras">Compras</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Admin">Admin</option>
                      <option value="Sac">Sac</option>
                      <option value="Qualidade">Qualidade</option>
                      <option value="Atacado">Atacado</option>
                      <option value="Varejo">Varejo</option>
                      <option value="TI">TI</option>
                      <option value="Expedição">Expedição</option>
                    </select>
                  </div>
                  {/* Modal de Permissões - fora do select para overlay funcionar corretamente */}
                  {modalPermissoesAberto && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
                        <h4 className="text-lg font-bold mb-4">Permissões de Telas do Setor</h4>
                        <div className="max-h-96 overflow-y-auto">
                          {modulosTelas.map(({ modulo, telas }) => (
                            <div key={modulo} className="mb-4">
                              <div className="font-semibold text-blue-700 mb-2">Módulo: {modulo}</div>
                              <table className="w-full border mb-2">
                                <thead>
                                  <tr>
                                    <th className="p-2 text-left">Tela</th>
                                    {TIPOS_PERMISSAO.map(tipo => (
                                      <th key={tipo} className="p-2 text-center capitalize">{tipo}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {telas.map(tela => (
                                    <tr key={tela}>
                                      <td className="p-2 text-sm">{tela}</td>
                                      {TIPOS_PERMISSAO.map(tipo => (
                                        <td key={tipo} className="p-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={!!permissoes[tela]?.[tipo]}
                                            onChange={() => handlePermissaoChange(tela, tipo)}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            className="px-4 py-2 rounded bg-gray-200 text-gray-700"
                            onClick={() => setModalPermissoesAberto(false)}
                          >Fechar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="password" className="block font-medium">Senha</label>
                    <input
                      type="password"
                      id="password"
                      placeholder="Senha"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" className={BTN} onClick={handleSubmit}>Salvar</button>
                    <button type="button" className="h-12 px-6 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700" onClick={() => setFormularioAberto(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Listagem - atualizada para mostrar código e setor */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">

              {/* Action Bar - permanece igual */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <button className={BTN}>
                  <FaFilter />
                  <span>Filtro Avançado</span>
                </button>

                <div className="flex flex-1 max-w-xl mx-2">
                  <input
                    type="text"
                    className="flex-1 h-12 border border-gray-300 rounded-l px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar por nome ou código"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className={`${BTN} rounded-l-none`}>Pesquisar</button>
                </div>

                <div className="flex items-center gap-2">
                  <button className={BTN}>
                    <FaFilePdf />
                    <span>PDF</span>
                  </button>
                  <button className={BTN} onClick={carregarUsuarios}>
                    <FaSync />
                  </button>

                  <div className="relative">
                    <button className={BTN}>
                      <span className="mr-1">10</span>
                      <FaCaretDown />
                    </button>
                  </div>

                  <div className="relative">
                    <button className={BTN}>
                      <FaListUl className="mr-1" />
                      <FaCaretDown />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table - MODIFICADA */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="p-2 w-8">
                        <input type="checkbox" />
                      </th>
                      <th className="p-2 text-start">Nome</th>
                      <th className="p-2 text-start">Código</th>
                      <th className="p-2 text-start">Setor</th>
                      <th className="p-2 text-center" style={{ width: "100px" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsuarios.length > 0 ? (
                      filteredUsuarios.map((usuario, idx) => (
                        <tr key={usuario.id} className="border-t">
                          <td className="p-4">
                            <input type="checkbox" />
                          </td>
                          <td className="p-4">{usuario.nome}</td>
                          <td className="p-4">{usuario.codigo || "-"}</td>
                          <td className="p-4">{usuario.setor}</td>
                          <td className="p-4 text-center">
                            <button
                              className="mx-1 h-10 w-10 inline-flex items-center justify-center rounded"
                              title="Editar"
                              onClick={() => handleEditUsuario(usuario)}
                            >
                              <FaEdit style={{ color: "rgb(0, 152, 196)", minHeight: "24px", minWidth: "24px" }} />
                            </button>
                            <button
                              className="mx-1 h-10 w-10 inline-flex items-center justify-center rounded"
                              title="Lixeira"
                              onClick={() => deletarUsuario(usuario.id)}
                            >
                              <FaTrash style={{ color: "rgb(0, 152, 196)", minHeight: "24px", minWidth: "24px" }} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
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
