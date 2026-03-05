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
  const { data, isLoading } = useSWR('/api/auth/me', async (url: string) => {
    try {
      const res = await fetch(url);
      if (res.status === 401) { console.warn('Usuário não autenticado (401). Limpando cookies.');
        // Limpa os cookies ao receber 401
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
        });
      }
      return await res.json();
    } catch (error) {console.error('Erro ao verificar autenticação:', error);
      // Limpa os cookies ao capturar erro
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      throw error;
    }
  });

  // Enquanto carrega, não faz nada (evita redirect prematuro)
  if (isLoading) return <>{children}</>;

  // Se o SWR já carregou e o usuário não está autenticado, redireciona para login
  if (data && !data.authenticated) {
    router.replace('/login');
    return null;
  }

  return <>{children}</>;
}


