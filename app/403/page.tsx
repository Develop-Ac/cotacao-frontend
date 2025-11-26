export default function Forbidden() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">403 – Acesso negado</h1>
                <p className="mt-2">Você não tem permissão para acessar esta página.</p>
                <a
                    href="/"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Voltar para a página inicial
                </a>
            </div>
        </div>
    );
}