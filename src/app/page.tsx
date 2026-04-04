'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  // Se già loggato, vai direttamente al calendario
  useEffect(() => {
    const utente = localStorage.getItem('ccm_utente')
    if (utente) {
      const u = JSON.parse(utente)
      if (u.ruolo === 'admin') router.push('/admin')
      else if (u.accesso_calendario) router.push('/calendario')
    }
  }, [])

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          min-height: 100vh;
        }
        .bg {
          position: fixed; inset: 0; z-index: 0;
          background: linear-gradient(135deg,
            #cddcec 0%, #ddd5ef 20%, #eddde9 40%,
            #f0e6dc 60%, #ddeaf5 80%, #cddcec 100%);
          background-size: 600% 600%;
          animation: aurora 16s ease infinite;
        }
        .bg::after {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 30% 40%, rgba(255,220,240,0.45) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 60%, rgba(200,220,255,0.45) 0%, transparent 60%);
          animation: shimmer 10s ease-in-out infinite alternate;
        }
        @keyframes aurora {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 100% 0%; }
          50%  { background-position: 100% 100%; }
          75%  { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          width: 100%; height: 100vh;
        }
        .accesso {
          position: fixed; top: 28px; right: 40px; z-index: 10;
          color: #3d4a5c; font-size: 14px; font-weight: 300;
          letter-spacing: 0.06em; text-decoration: none;
          opacity: 0.75; transition: opacity 0.3s ease; cursor: pointer;
          background: none; border: none;
        }
        .accesso:hover { opacity: 1; }
        .title {
          font-size: clamp(28px, 5vw, 64px); font-weight: 200;
          letter-spacing: 0.03em; color: #2d3a4a;
          margin-bottom: 56px; text-align: center;
          animation: fadeDown 1.4s ease forwards; opacity: 0;
        }
        .title sup { font-size: 0.32em; vertical-align: super; font-weight: 300; opacity: 0.65; }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .footer {
          position: fixed; bottom: 28px; left: 40px; z-index: 10;
          color: #3d4a5c; font-size: 11.5px; font-weight: 300;
          line-height: 1.7; letter-spacing: 0.02em; opacity: 0.55;
        }
      `}</style>

      <div className="bg" />

      <button className="accesso" onClick={() => router.push('/login')}>
        Accesso
      </button>

      <div className="content">
        <h1 className="title">CorpoCoscienteMente<sup>®</sup></h1>

        <img src="/simbolo.png" alt="Simbolo CorpoCoscienteMente" style={{width:'min(280px, 44vw)', height:'auto'}}/>
      </div>

      <div className="footer">
        CorpoCoscienteMente®<br/>
        e il simbolo sono<br/>
        marchi registrati
      </div>
    </>
  )
}
