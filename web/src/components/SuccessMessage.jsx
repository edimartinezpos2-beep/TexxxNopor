import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, MailCheck } from 'lucide-react';

/**
 * SuccessMessage Component
 * Displays the confirmation state with a rotating neon glow ring,
 * spring entrance, and a smooth return button to login.
 */
export const SuccessMessage = ({ email, onBackToLogin }) => {
  return (
    <motion.div
      className="success-container"
      initial={{ opacity: 0, scale: 0.92, y: 15, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.94, y: -10, filter: 'blur(10px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Icono animado con anillo de glow tecnológico */}
      <motion.div
        className="success-icon-wrapper"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
      >
        <div className="success-icon-glow-ring" />
        <MailCheck size={38} strokeWidth={2.2} />
      </motion.div>

      {/* Título de éxito */}
      <motion.h2
        className="success-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        ¡Correo enviado!
      </motion.h2>

      {/* Mensaje detallado */}
      <motion.p
        className="success-message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        Hemos enviado un enlace de recuperación a{' '}
        {email ? <span className="success-email-highlight">{email}</span> : 'tu correo electrónico'}.
        <br />
        Revisa tu bandeja de entrada y sigue las instrucciones para recuperar tu contraseña.
      </motion.p>

      {/* Botón de retorno al login */}
      <motion.button
        type="button"
        id="back-to-login-button"
        className="back-to-login-btn"
        onClick={onBackToLogin}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, delay: 0.45 }}
      >
        <ArrowLeft size={17} />
        <span>Volver al inicio de sesión</span>
      </motion.button>
    </motion.div>
  );
};

export default SuccessMessage;
