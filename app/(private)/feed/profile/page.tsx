"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { useTheme } from "next-themes";
import { getUserProfile, updateUserProfile, uploadUserAvatar, UserProfile } from "@/lib/user-service";
import { useUser } from "@/app/context/UserContext";
import { MdCameraAlt, MdPerson, MdPalette, MdLock, MdSave, MdArrowBack, MdCheckCircle } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { theme, setTheme } = useTheme();
    const { success, error, warning } = useToast();
    const router = useRouter();
    const { user: profile, loading, refetch } = useUser(); // Alias user to profile to keep existing code mostly working

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form states
    const [nome, setNome] = useState("");
    const [temaPreferência, setTemaPreferência] = useState("system");
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [imgError, setImgError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImgError(false);
    }, [profile?.avatar_url]);

    // Sync form with profile data when it loads
    useEffect(() => {
        if (profile) {
            setNome(profile.nome || "");
            setTemaPreferência(profile.tema_preferencia || "system");
        }
    }, [profile]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            await uploadUserAvatar(file);
            await refetch(); // Update context
            success("Avatar atualizado com sucesso!");
        } catch (err) {
            console.error(err);
            error("Falha ao atualizar avatar");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveBasicInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateUserProfile({
                nome,
                tema_preferencia: temaPreferência,
            });
            await refetch(); // Update context
            setTheme(temaPreferência);
            success("Informações atualizadas!");
        } catch (err) {
            console.error(err);
            error("Erro ao salvar informações");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (novaSenha !== confirmarSenha) {
            error("As senhas não coincidem");
            return;
        }

        try {
            setSaving(true);
            await updateUserProfile({
                senha_atual: senhaAtual,
                nova_senha: novaSenha,
            });
            success("Senha alterada com sucesso!");
            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarSenha("");
        } catch (err) {
            console.error(err);
            error("Erro ao alterar senha");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-10 max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie suas informações e preferências</p>
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <MdArrowBack /> Voltar para o Feed
                </Link>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Avatar & Summary */}
                <div className="lg:col-span-1">
                    <motion.div
                        layoutId="profile-card-container"
                        className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center sticky top-24"
                    >
                        <div className="relative group cursor-pointer mb-6" onClick={handleAvatarClick}>
                            <motion.div
                                layoutId="profile-avatar-container"
                                className="h-32 w-32 rounded-full overflow-hidden border-4 border-blue-50/50 dark:border-blue-900/30 relative"
                            >
                                {profile?.avatar_url && !imgError ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt={profile.nome || "Avatar"}
                                        fill
                                        unoptimized
                                        className="object-cover group-hover:opacity-75 transition-opacity"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white">
                                        {profile?.nome?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <MdCameraAlt className="text-white text-3xl" />
                                </div>
                            </motion.div>

                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 z-10">
                                    <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>

                        <motion.h2
                            layoutId="profile-name"
                            className="text-xl font-bold text-gray-900 dark:text-white mb-1"
                        >
                            {profile?.nome}
                        </motion.h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {profile?.setor}
                        </p>

                        <div className="w-full space-y-3">
                            <div className="flex justify-between text-sm py-3 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-gray-500">ID de Usuário</span>
                                <span className="font-mono text-gray-900 dark:text-white">#{profile?.id?.slice(-6) || '...'}</span>
                            </div>
                            <div className="flex justify-between text-sm py-3 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-gray-500">Tema Atual</span>
                                <span className="capitalize text-gray-900 dark:text-white">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Tabs/Sections */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info Section */}
                    <motion.section
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <MdPerson className="text-blue-600 dark:text-blue-400 text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Informações Básicas</h3>
                        </div>

                        <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome de Exibição</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">Preferência de Tema</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'light', label: 'Claro', icon: '☀️' },
                                        { id: 'dark', label: 'Escuro', icon: '🌙' },
                                        { id: 'system', label: 'Sistema', icon: '💻' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTemaPreferência(t.id)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${temaPreferência === t.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span className="text-2xl">{t.icon}</span>
                                            <span className="text-xs font-bold font-medium">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                                >
                                    {saving ? (
                                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <MdSave className="text-xl" />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.section>

                    {/* Security Section */}
                    <motion.section
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <MdLock className="text-purple-600 dark:text-purple-400 text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Segurança</h3>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Senha Atual</label>
                                <input
                                    type="password"
                                    value={senhaAtual}
                                    onChange={(e) => setSenhaAtual(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nova Senha</label>
                                    <input
                                        type="password"
                                        value={novaSenha}
                                        onChange={(e) => setNovaSenha(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        placeholder="No mínimo 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        value={confirmarSenha}
                                        onChange={(e) => setConfirmarSenha(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Repita a nova senha"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving || !novaSenha || !senhaAtual}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                                >
                                    Alterar Senha
                                </button>
                            </div>
                        </form>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
