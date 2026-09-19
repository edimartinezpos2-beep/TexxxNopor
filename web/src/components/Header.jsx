import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Flame, Cpu } from 'lucide-react';

/**
 * Header Component
 * Displays the project logo (TexxxNopor), title "Recuperación de cuenta",
 * and high-tech security indicators with smooth entrance animation.
 */
export const Header = () => {
  return (
    <motion.header
      className="header-wrapper"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="header-brand">
        <div className="brand-logo-badge">
          <Flame size={20} color="#00F2FE" />
          <span className="brand-logo-text">TexxxNopor</span>
        </div>
        <div className="brand-divider" />
        <span className="brand-section-title">Recuperación de cuenta</span>
      </div>

      <div className="header-status-badge">
        <div className="status-dot" />
        <ShieldCheck size={14} />
        <span>SECURE NODE 256-BIT</span>
      </div>
    </motion.header>
  );
};

export default Header;
