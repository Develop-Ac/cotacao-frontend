
import { Post, Event } from '@/app/(private)/feed/types';

// O proxy já injeta o ID do usuário e autentica via Cookie
const PROXY_URL = '/api/proxy/feed'; // URL relativa ao Next.js

export async function fetchFeedPosts(skip = 0, take = 10): Promise<Post[]> {
    // /api/proxy/feed/feed?skip=...
    const url = `${PROXY_URL}/feed?skip=${skip}&take=${take}`;
    const res = await fetch(url.toString(), {
        // Headers são gerenciados pelo browser (cookies)
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch posts');
    }
    return res.json();
}

export async function fetchEvents(): Promise<Event[]> {
    const url = `${PROXY_URL}/events`;
    const res = await fetch(url, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch events');
    }
    return res.json();
}

export async function createPost(formData: FormData): Promise<Post> {
    const url = `${PROXY_URL}/feed`;

    // Não precisamos de headers manuais, nem content-type (browser define boundary)
    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create post');
    }
    return res.json();
}

export async function deletePost(id: string): Promise<void> {
    const url = `${PROXY_URL}/feed/${id}`;
    const res = await fetch(url, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete post');
    }
}

export async function createEvent(data: {
    titulo: string;
    descricao?: string;
    data: string;
    hora: string;
    local: string;
    tipo: string;
}): Promise<any> {
    const url = `${PROXY_URL}/events`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create event');
    }
    return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
    const url = `${PROXY_URL}/events/${id}`;
    const res = await fetch(url, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete event');
    }
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
    const url = `${PROXY_URL}/feed/${postId}/like`;
    const res = await fetch(url, {
        method: 'POST',
    });

    if (!res.ok) {
        throw new Error('Failed to toggle like');
    }
    return res.json();
}

export async function fetchComments(postId: string): Promise<any[]> {
    const url = `${PROXY_URL}/feed/${postId}/comments`;
    const res = await fetch(url, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch comments');
    }
    return res.json();
}

export async function createComment(postId: string, conteudo: string): Promise<any> {
    const url = `${PROXY_URL}/feed/${postId}/comments`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conteudo }),
    });

    if (!res.ok) {
        throw new Error('Failed to create comment');
    }
    return res.json();
}

export async function deleteComment(commentId: string): Promise<void> {
    const url = `${PROXY_URL}/feed/comments/${commentId}`;
    const res = await fetch(url, {
        method: 'DELETE',
    });

    if (!res.ok) {
        throw new Error('Failed to delete comment');
    }
}
