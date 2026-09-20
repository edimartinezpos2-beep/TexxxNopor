import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecuperarPassword from './pages/RecuperarPassword';
import { Flame, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * App Component
 * Handles views: 'recovery' and 'login'
 * Orchestrates seamless transitions with scale, blur, and opacity changes.
 */
export function App() {
  const [currentView, setCurrentView] = useState('recovery'); // 'recovery' | 'login'

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {currentView === 'recovery' ? (
          <motion.div
            key="view-recovery"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              filter: 'blur(12px)',
              transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <RecuperarPassword onNavigateToLogin={() => setCurrentView('login')} />
          </motion.div>
        ) : (
          <motion.div
            key="view-login"
            className="app-container"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(12px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ambient-background">
              <div className="ambient-grid" />
            </div>

            {/* Header simulado para la pantalla de Login */}
            <header className="header-wrapper">
              <div className="header-brand">
                <div className="brand-logo-badge">
                  <Flame size={20} color="#E50914" />
                  <span className="brand-logo-text">TexxxNopor</span>
                </div>
                <div className="brand-divider" />
                <span className="brand-section-title">Portal de Acceso</span>
              </div>
              <div className="header-status-badge">
                <div className="status-dot" />
                <ShieldCheck size={14} />
                <span>ONLINE 256-BIT</span>
              </div>
            </header>

            <main className="content-center">
              <div className="login-mock-card">
                <div className="card-header-badge-wrapper">
                  <div className="tech-indicator-pill">
                    <Lock size={12} strokeWidth={2.5} />
                    <span>AUTHENTICATION GATEWAY</span>
                  </div>
                </div>

                <h2 className="login-mock-title">Iniciar Sesión</h2>
                <p className="login-mock-desc">
                  Bienvenido de vuelta. Ingresa a tu cuenta segura en TexxxNopor.
                </p>

                <button
                  type="button"
                  className="recovery-button"
                  style={{ marginBottom: '1.25rem' }}
                  onClick={() => alert('Sesión simulada lista')}
                >
                  <span>Ingresar a la plataforma</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  className="back-to-login-btn"
                  onClick={() => setCurrentView('recovery')}
                >
                  <span>¿Olvidaste tu contraseña? Recuperar acceso</span>
                </button>
              </div>
            </main>

            <div style={{ height: 60 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
