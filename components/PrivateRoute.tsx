// components/PrivateRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const autenticado = localStorage.getItem('auth') === 'true';

    if (!autenticado) {
      router.push('/login');
    }
  }, []);

  return <>{children}</>;
}
