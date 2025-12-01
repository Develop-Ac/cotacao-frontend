import Image from 'next/image';
import { MdThumbUp, MdComment, MdShare } from 'react-icons/md';

interface PostProps {
    author: {
        name: string;
        avatar: string;
        role: string;
    };
    timestamp: string;
    content: string;
    image?: string;
    likes: number;
    comments: number;
}

export default function Post({ author, timestamp, content, image, likes, comments }: PostProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                    <Image
                        src={author.avatar}
                        alt={author.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">
                        {author.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {author.role} • {timestamp}
                    </p>
                </div>
            </div>

            <p className="mb-4 text-gray-600 dark:text-gray-300">
                {content}
            </p>

            {image && (
                <div className="relative h-64 w-full rounded-lg overflow-hidden mb-4">
                    <Image
                        src={image}
                        alt="Post content"
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors">
                    <MdThumbUp className="text-lg" />
                    <span>Curtir ({likes})</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors">
                    <MdComment className="text-lg" />
                    <span>Comentar ({comments})</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors">
                    <MdShare className="text-lg" />
                    <span>Compartilhar</span>
                </button>
            </div>
        </div>
    );
}
