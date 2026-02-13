"use client";

import { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import Post from './Post';
import EventModal from './EventModal';
import RichTextEditor from './RichTextEditor';
import { MdImage, MdVideocam, MdEvent, MdSend } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFeedPosts, createPost } from '@/lib/api-feed';
import { Post as PostType } from '../types';
import { useToast } from '@/components/Toast';
import { AbilityContext } from '@/app/components/AbilityProvider';
import { useUser } from '@/app/context/UserContext';

export default function Feed() {
    const [posts, setPosts] = useState<PostType[]>([]);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const { user } = useUser();
    const [imgError, setImgError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error } = useToast();
    const ability = useContext(AbilityContext);

    const loadPosts = async () => {
        try {
            const data = await fetchFeedPosts();
            setPosts(data);
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        setImgError(false);
    }, [user?.avatar_url]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async () => {
        const isContentEmpty = !content.trim() || content === '<p></p>';
        if (isContentEmpty && files.length === 0) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('conteudo', content);
            files.forEach(file => {
                formData.append('files', file);
            });

            await createPost(formData);

            setContent('');
            setFiles([]);
            await loadPosts();
            success('Post criado com sucesso!');
        } catch (err) {
            console.error('Error creating post:', err);
            error('Erro ao criar post');
        } finally {
            setIsLoading(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    return (
        <div className="flex flex-col">
            {/* Create Post Widget */}
            {ability.can('update', '/feed') && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm mb-6"
                >
                    <div className="flex gap-4 mb-4">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden shrink-0 bg-gray-200 border border-gray-100 dark:border-gray-800 dark:bg-gray-700">
                            {user?.avatar_url && !imgError ? (
                                <img
                                    src={user?.avatar_url || ''}
                                    alt={user?.nome || "Avatar"}
                                    className="h-full w-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="h-full w-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white uppercase">
                                    {(user?.nome || 'U').charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <RichTextEditor
                                content={content}
                                onChange={(html) => setContent(html)}
                                placeholder={`No que você está pensando, ${user?.nome ? user.nome.split(' ')[0] : 'colega'}?`}
                            />
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="mb-4 flex gap-2 overflow-x-auto p-2 bg-gray-50 rounded-xl dark:bg-gray-800/50">
                            {files.map((file, i) => (
                                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                    {file.type.startsWith('image/') ? (
                                        <Image src={URL.createObjectURL(file)} alt="preview" fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-white text-xs font-medium text-gray-500">
                                            {file.name.slice(0, 8)}...
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setFiles(files.filter((_, index) => index !== i))}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                                <MdImage className="text-xl text-green-500" />
                                <span>Foto/Vídeo</span>
                            </button>
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*,application/pdf"
                                onChange={handleFileSelect}
                            />

                            {isEventModalOpen ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium opacity-0 pointer-events-none" aria-hidden="true">
                                    <MdEvent className="text-xl" />
                                    <span>Evento</span>
                                </div>
                            ) : (
                                <motion.button
                                    layoutId="create-event-modal"
                                    onClick={() => setIsEventModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
                                >
                                    <MdEvent className="text-xl text-yellow-500" />
                                    <motion.span layoutId='create-event-text'>Evento</motion.span>
                                </motion.button>
                            )}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || ((!content.trim() || content === '<p></p>') && files.length === 0)}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                        >
                            {isLoading ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {isEventModalOpen && (
                    <EventModal
                        isOpen={isEventModalOpen}
                        onClose={() => setIsEventModalOpen(false)}
                        onSuccess={() => {
                            console.log('Dispatching events:updated');
                            window.dispatchEvent(new CustomEvent('events:updated'));
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Posts List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                className="flex flex-col"
            >
                {posts.map((post) => (
                    <Post key={post.id} {...post} onDelete={loadPosts} />
                ))}
                {posts.length === 0 && (
                    <p className="text-center text-gray-500 py-10">Nenhuma publicação ainda.</p>
                )}
            </motion.div>
        </div>
    );
}
