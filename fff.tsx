    <html lang="en">
      <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
        {/* Top Navbar */}
        <nav style={{ height: "56px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #e5e5e5" }}>
        <img src="../icon.png" style={{ width: "32px", height: "32px", marginRight: "12px" }} alt="Ícone" />  
        <button style={{ background: "none", border: "none", color: "#222", fontSize: "16px", cursor: "pointer" }} onClick={deslogar}>
          Sair
        </button>
        </nav>
        <div style={{ display: "flex", flex: 1 }}>
        {/* Side Navbar */}
        <aside style={{ width: "220px", background: "#fafafa", borderRight: "1px solid #e5e5e5", padding: "24px 0" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ padding: "12px 24px" }}>
            <a href="/" style={{ textDecoration: "none", color: "#222" }}>Página Inicial</a>
          </li>
          <li style={{ padding: "12px 24px" }}>
            <a href="/cotacoes" style={{ textDecoration: "none", color: "#222" }}>Cotações</a>
          </li>
          <li style={{ padding: "12px 24px" }}>
            <a href="/sobre" style={{ textDecoration: "none", color: "#222" }}>Sobre</a>
          </li>
          {/* Adicione mais páginas conforme necessário */}
          </ul>
        </aside>
        {/* Main Content */}
        <main style={{ flex: 1, padding: "32px" }}>
          {children}
        </main>
        {auth}
        </div>
      </div>
      </body>
    </html>