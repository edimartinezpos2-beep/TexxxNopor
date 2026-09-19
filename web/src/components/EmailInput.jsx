import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, AlertCircle } from 'lucide-react';

/**
 * EmailInput Component
 * Supports interactive focus states, cyan glow, smooth placeholder transitions,
 * and Framer Motion horizontal shake animation when an error occurs.
 */
export const EmailInput = ({
  value,
  onChange,
  onKeyDown,
  errorMessage,
  shakeKey,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Variantes para el efecto de shake horizontal suave
  const shakeVariants = {
    idle: { x: 0 },
    shake: {
      x: [-5, 5, -3, 3, 0],
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
  };

  return (
    <div className="input-group">
      <motion.div
        className={`input-container ${isFocused ? 'focused' : ''} ${
          errorMessage ? 'has-error' : ''
        }`}
        variants={shakeVariants}
        animate={shakeKey > 0 ? 'shake' : 'idle'}
        key={shakeKey}
      >
        <Mail
          size={19}
          className="input-icon"
          strokeWidth={2}
        />
        <input
          type="email"
          name="email"
          id="recovery-email-input"
          className="email-field"
          placeholder="Ingresa tu correo electrónico"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoComplete="email"
          spellCheck={false}
        />
      </motion.div>

      {errorMessage && (
        <motion.div
          className="error-text-discrete"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </motion.div>
      )}
    </div>
  );
};

export default EmailInput;
