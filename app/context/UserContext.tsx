"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUserProfile, UserProfile } from "@/lib/user-service";

interface UserContextType {
    user: UserProfile | null;
    loading: boolean;
    refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async () => {
        try {
            const data = await getUserProfile();
            setUser(data);
            localStorage.setItem("userData", JSON.stringify(data));
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Load from local storage immediately to prevent flicker
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("userData");
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                } catch (e) {
                    console.error("Error parsing stored user data", e);
                }
            }
        }

        // 2. Fetch fresh data
        loadProfile();

        // 3. Listen for updates (optional, if other components update local storage)
        const handleStorageChange = () => {
            const stored = localStorage.getItem("userData");
            if (stored) setUser(JSON.parse(stored));
        };
        window.addEventListener("userDataUpdated", loadProfile); // Custom event
        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("userDataUpdated", loadProfile);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, refetch: loadProfile }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
