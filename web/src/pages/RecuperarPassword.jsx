import React from 'react';
import Header from '../components/Header';
import RecoveryCard from '../components/RecoveryCard';

/**
 * RecuperarPassword Page Component
 * Main page container with TexxxNopor dark ambient glow effects
 * and centered recovery card.
 */
export const RecuperarPassword = ({ onNavigateToLogin }) => {
  return (
    <div className="app-container">
      {/* Luces de fondo y ambientación TexxxNopor */}
      <div className="ambient-background">
        <div className="ambient-grid" />
      </div>

      {/* Header superior con animación */}
      <Header />

      {/* Contenedor central con tarjeta de recuperación */}
      <main className="content-center">
        <RecoveryCard onBackToLogin={onNavigateToLogin} />
      </main>
    </div>
  );
};

export default RecuperarPassword;
