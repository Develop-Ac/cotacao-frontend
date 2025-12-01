import Image from 'next/image';
import Post from './Post';
import { MdImage, MdVideocam, MdEvent } from 'react-icons/md';

const MOCK_POSTS = [
    {
        id: 1,
        author: {
            name: 'Ana Silva',
            avatar: 'https://ui-avatars.com/api/?name=Ana+Silva&background=random',
            role: 'Recursos Humanos',
        },
        timestamp: '2 horas atrás',
        content: '🎉 Parabéns a todos pelo excelente resultado no último trimestre! A meta foi batida com sucesso. Vamos comemorar na próxima sexta-feira com um happy hour especial!',
        likes: 24,
        comments: 5,
    },
    {
        id: 2,
        author: {
            name: 'Carlos Oliveira',
            avatar: 'https://ui-avatars.com/api/?name=Carlos+Oliveira&background=random',
            role: 'Gerente de Vendas',
        },
        timestamp: '4 horas atrás',
        content: 'Novos produtos chegaram ao estoque! Confiram as novidades no catálogo atualizado.',
        image: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Novos+Produtos',
        likes: 15,
        comments: 2,
    },
    {
        id: 3,
        author: {
            name: 'Marketing Team',
            avatar: 'https://ui-avatars.com/api/?name=Marketing+Team&background=random',
            role: 'Marketing',
        },
        timestamp: '1 dia atrás',
        content: 'A nova campanha de verão está no ar! Compartilhem em suas redes sociais.',
        likes: 42,
        comments: 8,
    },
];

export default function Feed() {
    return (
        <div className="flex flex-col">
            {/* Create Post Widget */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm mb-6">
                <div className="flex gap-4 mb-4">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                        <Image
                            src="https://ui-avatars.com/api/?name=User&background=random"
                            alt="Current User"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="No que você está pensando?"
                        className="w-full rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 transition-colors">
                            <MdImage className="text-xl text-green-500" />
                            <span>Foto</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 transition-colors">
                            <MdVideocam className="text-xl text-red-500" />
                            <span>Vídeo</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 transition-colors">
                            <MdEvent className="text-xl text-yellow-500" />
                            <span>Evento</span>
                        </button>
                    </div>
                    <button className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                        Publicar
                    </button>
                </div>
            </div>

            {/* Posts List */}
            <div className="flex flex-col">
                {MOCK_POSTS.map((post) => (
                    <Post key={post.id} {...post} />
                ))}
            </div>
        </div>
    );
}
