import React from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

/**
 * RecoveryButton Component
 * Features futuristic gradient, scale on hover (1 -> 1.02),
 * tap animation (scale: 0.97 -> 1), and "Enviando..." loading state with spinner.
 */
export const RecoveryButton = ({
  onClick,
  isLoading = false,
  disabled = false,
  children = 'Enviar enlace de recuperación',
}) => {
  return (
    <motion.button
      type="button"
      id="submit-recovery-button"
      className="recovery-button"
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {isLoading ? (
        <>
          <div className="button-spinner" />
          <span>Enviando...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <Send size={17} strokeWidth={2.2} />
        </>
      )}
    </motion.button>
  );
};

export default RecoveryButton;
