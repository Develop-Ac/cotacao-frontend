import { serviceUrl } from "@/lib/services";

export interface UserProfile {
    id: string;
    nome: string;
    avatar_url?: string;
    tema_preferencia?: string;
    setor: string;
    _count?: {
        fed_posts: number;
    };
}

export interface UpdateProfileData {
    nome?: string;
    tema_preferencia?: string;
    senha_atual?: string;
    nova_senha?: string;
}

const getHeaders = () => {
    // In a real app, you might need to get the token from cookies or local storage if not handled by proxy/browser
    // Assuming the auth token is in a cookie that is automatically sent, OR we need to add it.
    // The login route sets an HTTP-only cookie 'auth_token'. 
    // If we are calling from the client (browser), valid cookies for the domain are sent automatically.
    // HOWEVER, the feed service is on a different port (8001) or domain. 
    // If it's a different domain, we need CORS and credentials.
    // If 'serviceUrl' returns a different domain, we need to ensure credentials are sent.
    return {
        "Content-Type": "application/json",
    };
};

export const getUserProfile = async (): Promise<UserProfile> => {
    // We are calling the feed service directly? Or via a Next.js proxy?
    // The spec says GET /users/me. 
    // If we call feed-service directly, we need the token. 
    // The cookie is httpOnly, so we can't access it in JS to send in Authorization header.
    // We might need a Next.js API route to proxy the request if the token isn't shared/accessible.
    // OPTION 1: Call /api/feed/users/me (create a proxy in Next.js).
    // OPTION 2: If feed-service is on same top domain and cookie is scoped properly, it might work.
    // Given the architecture, usually a proxy or BFF pattern is used.
    // Let's assume we need to call the Next.js API route which forwards to the backend.

    // BUT the specification implies changing the backend.
    // Let's try calling the service URL directly first, but if auth fails, we'll need a proxy.
    // Actually, `serviceUrl('feed')` returns `http://localhost:8001`.
    // The cookie is set for path `/`. Domain localhost?
    // Next.js is likely on 3000. 8001 is different port. Cookies *can* be shared if SameSite allows.
    // But `auth_token` is HttpOnly.
    // Let's use a Next.js Route Handler as a proxy to inject the token.

    // WAIT: The existing login sets a cookie. 
    // Is there an existing pattern? 
    // Let's look at `lib/services.ts` again. fallback is localhost:8001.
    // I'll assume for now we can call via a proxy or the token is available. 
    // Actually, I'll create a proxy route in `app/api/users/me/route.ts` to be safe and consistent with auth.

    const res = await fetch("/api/users/me");
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
};

export const updateUserProfile = async (data: UpdateProfileData) => {
    const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
    }
    return res.json();
};

export const uploadUserAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload avatar");
    return res.json();
};
