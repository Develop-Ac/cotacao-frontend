            {valores[0].orcamentos.map((item, index) => (
                <div key={index} className="min-w-[500px] bg-white p-4 shadow rounded border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">FORNECEDOR:</label>
                <input
                    type="text"
                    name="nome"
                    // value={item.dados.fornecedor}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                />

                <div className="flex justify-between items-center my-4">
                    <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
                </div>

                <div className="overflow-x-auto rounded-2xl shadow-md bg-white border border-gray-200">
                  <table className="min-w-full text-sm text-gray-700">
                    <thead className="bg-gray-100 text-gray-900 uppercase text-xs font-semibold">
                      <tr>
                        {/* <th className="px-6 py-4 text-left">Descrição</th> */}
                        <th className="px-6 py-4 text-left">Valor Unitário</th>
                        <th className="px-6 py-4 text-left">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.orcamentos.itens.map((item: { quantidade: any; valor: string; menorValor: any; }, idx: Key | null | undefined) => {
                        const quantidade = Number(item.quantidade ?? 0);
                        const valor =
                          typeof item.valor === 'string'
                            ? Number(item.valor.replace(',', '.'))
                            : typeof item.valor === 'number' || typeof item.valor === 'bigint'
                            ? Number(item.valor)
                            : 0;
                        const total = valor * quantidade;

                        return (
                          <tr
                            key={idx}
                            className={
                              typeof idx === 'number'
                                ? idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-gray-50 hover:bg-gray-100'
                                : ''
                            }
                          >
                            {/* <td className="px-6 py-4">{item.descricao}</td> */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap font-medium ${
                                item.menorValor ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {total.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <p className="text-sm text-black text-right font-semibold px-6 py-4">
                    Valor Total:{' '}
                    {item.orcamentos.itens
                      .reduce((acc: number, item: { quantidade: any; valor: string; }) => {
                        const quantidade = Number(item.quantidade ?? 0);
                        const valor =
                          typeof item.valor === 'string'
                            ? Number(item.valor.replace(',', '.'))
                            : typeof item.valor === 'number' || typeof item.valor === 'bigint'
                            ? Number(item.valor)
                            : 0;
                        return acc + valor * quantidade;
                      }, 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>


                <label className="block text-sm font-medium text-gray-700 mt-2">Observação</label>
                <input
                    type="text"
                    value={item.orcamentos.observacao}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mt-1"
                    placeholder="Observação"
                />
                </div>
            ))}