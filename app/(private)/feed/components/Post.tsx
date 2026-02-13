import Image from 'next/image';
import { MdThumbUp, MdComment, MdShare, MdDelete } from 'react-icons/md';
import { AnimatePresence, motion } from 'framer-motion';
import { Post as PostType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { deletePost } from '@/lib/api-feed';

import { useState, useEffect } from 'react';

interface PostProps extends PostType {
    onDelete?: () => void;
}

import { toggleLike, fetchComments, createComment, deleteComment } from '@/lib/api-feed';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/components/Toast';
import { AbilityContext } from '@/app/components/AbilityProvider';
import { useContext } from 'react';

export default function Post({ id, autor, criado_em, conteudo, midias, curtidas, comentarios, onDelete, ja_curtiu }: PostProps) {
    const [imgError, setImgError] = useState(false);
    const { success, error } = useToast();
    const ability = useContext(AbilityContext);
    const timestamp = formatDistanceToNow(new Date(criado_em), { addSuffix: true, locale: ptBR });

    useEffect(() => {
        setImgError(false);
    }, [autor.avatar_url]);

    // Likes State
    const [liked, setLiked] = useState(!!ja_curtiu);
    const [likeCount, setLikeCount] = useState(curtidas);

    // Update liked state when props change (specifically for ja_curtiu)
    useEffect(() => {
        if (ja_curtiu !== undefined) {
            setLiked(ja_curtiu);
        }
    }, [ja_curtiu]);

    // Comments State
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>(comentarios || []);
    const [commentCount, setCommentCount] = useState(comentarios?.length || 0);
    const [newComment, setNewComment] = useState('');
    const [loadingComment, setLoadingComment] = useState(false);

    // Current User ID for comment deletion permission
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('userData');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setCurrentUserId(parsed.id); // Assuming 'id' is stored in userData
                }
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        if (showComments && comments.length === 0 && commentCount > 0) {
            // Fetch comments if expanded and empty but count > 0
            fetchComments(id).then(setComments).catch(console.error);
        }
    }, [showComments, id]);

    interface ConfirmModalState {
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void | Promise<void>;
        isLoading: boolean;
    }

    // Modals State
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isLoading: false
    });

    // Modals & Toasts
    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const handleLike = async () => {
        // Optimistic UI
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            await toggleLike(id);
        } catch (err) {
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(prev => !newLiked ? prev + 1 : prev - 1);
            console.error('Error toggling like:', err);
            error('Erro ao curtir post');
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoadingComment(true);
        try {
            const addedComment = await createComment(id, newComment);
            setComments(prev => [...prev, addedComment]);
            setCommentCount(prev => prev + 1);
            setNewComment('');
            success('Comentário enviado!');
        } catch (err) {
            console.error('Error adding comment:', err);
            error('Erro ao enviar comentário');
        } finally {
            setLoadingComment(false);
        }
    };

    const handleDeleteComment = (commentId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Comentário',
            message: 'Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.',
            isLoading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await deleteComment(commentId);
                    setComments(prev => prev.filter(c => c.id !== commentId));
                    setCommentCount(prev => prev - 1);
                    success('Comentário excluído com sucesso');
                    closeConfirmModal();
                } catch (err) {
                    console.error('Error deleting comment:', err);
                    error('Erro ao excluir comentário');
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    // console.log('Post media info:', { conteudo, midias });
    const media = midias && midias.length > 0 ? midias[0] : null;

    // Check if user has delete permission or is author
    const canDeletePost = autor.id === currentUserId || ability.can('delete', '/feed');

    const handleDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Post',
            message: 'Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.',
            isLoading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await deletePost(id);
                    success('Post excluído com sucesso');
                    onDelete?.();
                    closeConfirmModal();
                } catch (err) {
                    console.error('Error deleting post:', err);
                    error('Falha ao excluir post');
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    return (
        <>
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
                isLoading={confirmModal.isLoading}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                            {autor.avatar_url && !imgError ? (
                                <Image
                                    src={autor.avatar_url}
                                    alt={autor.nome || "Avatar"}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="h-full w-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                                    {autor.nome?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                                {autor.nome}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {autor.setor} • {timestamp}
                            </p>
                        </div>
                    </div>

                    {canDeletePost && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200"
                            title="Excluir post"
                        >
                            <MdDelete className="text-xl" />
                        </button>
                    )}
                </div>

                <div
                    className="mb-4 text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words [&_p]:min-h-[1.5em] [&_p]:mb-4 last:[&_p]:mb-0"
                    dangerouslySetInnerHTML={{ __html: conteudo }}
                />

                {media && (
                    <div className="relative w-full rounded-xl overflow-hidden mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                        {media.tipo === 'imagem' ? (
                            <div className="relative w-full">
                                <img
                                    src={media.url}
                                    alt="Post content"
                                    className="w-full h-auto max-h-[600px] object-contain"
                                />
                            </div>
                        ) : media.tipo === 'video' ? (
                            <video
                                src={media.url}
                                controls
                                className="h-full w-full max-h-[600px]"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full p-6">
                                <a
                                    href={media.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors group"
                                >
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Visualizar Anexo</p>
                                        <p className="text-xs text-gray-500">Clique para abrir</p>
                                    </div>
                                </a>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${liked ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20'}`}
                    >
                        <MdThumbUp className="text-xl" />
                        <span>Curtir ({likeCount})</span>
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                        <MdComment className="text-xl" />
                        <span>Comentar ({commentCount})</span>
                    </button>
                </div>

                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="space-y-4 mb-4">
                                    {comments.length === 0 ? (
                                        <p className="text-center text-gray-500 text-sm">Seja o primeiro a comentar!</p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 group">
                                                <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                                    {comment.autor?.avatar_url ? (
                                                        <Image
                                                            src={comment.autor.avatar_url}
                                                            alt={comment.autor.nome || "Avatar"}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {comment.autor?.nome?.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-2 relative">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                                            {comment.autor?.nome}
                                                        </span>

                                                        {(comment.autor?.id === currentUserId || ability.can('delete', '/feed')) && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                title="Excluir comentário"
                                                            >
                                                                <MdDelete className="text-sm" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {comment.conteudo}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleCommentSubmit} className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Escreva um comentário..."
                                            className="w-full rounded-2xl bg-gray-50 px-5 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 placeholder-gray-400"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || loadingComment}
                                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
