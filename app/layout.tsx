import "./globals.css";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="">
        {children}
      </body>
    </html>
  );
}
