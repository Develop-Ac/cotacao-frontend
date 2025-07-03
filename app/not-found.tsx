"use client"
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="container">
      <h1>404</h1>
      <h2>Página não encontrada</h2>
      <p>A página que você tentou acessar não existe ou foi movida.</p>
      <Link href="/" className="home-link" id='link'>Voltar para a página inicial</Link>

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
          background-color: #f9f9f9;
          color: #333;
          padding: 40px;
        }

        h1 {
          font-size: 96px;
          margin-bottom: 0;
          color: #ff6b6b;
        }

        h2 {
          font-size: 32px;
          margin-top: 10px;
          margin-bottom: 20px;
        }

        p {
          font-size: 18px;
          margin-bottom: 30px;
        }
      `}</style>
    </div>
  );
}
