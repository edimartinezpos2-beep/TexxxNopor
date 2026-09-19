import React from 'react';
import Header from '../components/Header';
import RecoveryCard from '../components/RecoveryCard';
import TechPanel from '../components/TechPanel';

/**
 * RecuperarPassword Page Component
 * Main page container with cyber-ambient glow effects,
 * centered card, and bottom developer technology panel.
 */
export const RecuperarPassword = ({ onNavigateToLogin }) => {
  return (
    <div className="app-container">
      {/* Luces de fondo y malla cibernética */}
      <div className="ambient-background">
        <div className="ambient-grid" />
      </div>

      {/* Header superior con animación */}
      <Header />

      {/* Contenedor central con tarjeta de recuperación */}
      <main className="content-center">
        <RecoveryCard onBackToLogin={onNavigateToLogin} />
      </main>

      {/* Paneles tecnológicos inferiores */}
      <TechPanel />
    </div>
  );
};

export default RecuperarPassword;
