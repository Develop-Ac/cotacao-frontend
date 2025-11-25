import React from "react";
import "./globals.css";
import { AbilityProvider } from "../app/components/AbilityProvider";


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="pt-BR">
<body>
<AbilityProvider>{children}</AbilityProvider>
</body>
</html>
);
}