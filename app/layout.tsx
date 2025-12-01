import React from "react";
import "./globals.css";
import { AbilityProvider } from "../app/components/AbilityProvider";
import { ThemeProvider } from "./components/ThemeProvider";


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <AbilityProvider>{children}</AbilityProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
