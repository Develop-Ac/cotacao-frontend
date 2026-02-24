// components/PrivateRoute.tsx
'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AbilityContext, AbilityLoadingContext } from '@/app/components/AbilityProvider';
import useSWR from 'swr';

/**
 * Guarda de rota baseada no cookie de autenticação (via SWR /api/auth/me).
 * Substitui o padrão antigo de localStorage.getItem('auth'),
 * que ficou obsoleto após a migração para cookies HTTP-only.
 */
export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Usa o mesmo SWR cache do AbilityProvider (chave idêntica = cache compartilhado)
  const { data, isLoading } = useSWR('/api/auth/me', (url: string) =>
    fetch(url).then(res => res.json())
  );

  // Enquanto carrega, não faz nada (evita redirect prematuro)
  if (isLoading) return <>{children}</>;

  // Se o SWR já carregou e o usuário não está autenticado, redireciona para login
  if (data && !data.authenticated) {
    router.replace('/login');
    return null;
  }

  return <>{children}</>;
}
