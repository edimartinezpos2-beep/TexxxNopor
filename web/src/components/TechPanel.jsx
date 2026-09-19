import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Terminal, Layers, Sparkles } from 'lucide-react';

/**
 * TechPanel Component
 * Renders futuristic technology badge chips (React.js, JavaScript, CSS3, Framer Motion)
 * and a decorative cybernetic code snippet demonstrating the recovery logic in React.
 */
export const TechPanel = () => {
  const technologies = [
    { name: 'React.js', icon: <Layers size={13} /> },
    { name: 'JavaScript', icon: <Code2 size={13} /> },
    { name: 'CSS3', icon: <Sparkles size={13} /> },
    { name: 'Framer Motion', icon: <Terminal size={13} /> },
  ];

  return (
    <motion.div
      className="tech-panel-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Chips tecnológicos */}
      <div className="tech-chips-row">
        {technologies.map((tech) => (
          <div key={tech.name} className="tech-chip">
            <span className="tech-chip-dot" />
            {tech.icon}
            <span>{tech.name}</span>
          </div>
        ))}
      </div>

      {/* Terminal de código decorativo */}
      <div className="code-terminal-card">
        <div className="terminal-header">
          <div className="terminal-dots">
            <div className="terminal-dot red" />
            <div className="terminal-dot yellow" />
            <div className="terminal-dot green" />
          </div>
          <span className="terminal-title">RecoveryHandler.jsx</span>
          <div style={{ width: 36 }} />
        </div>

        <pre className="terminal-code">
          <code>
            <span className="code-keyword">const</span>{' '}
            <span className="code-variable">recovery</span> ={' '}
            <span className="code-bool">true</span>;{'\n\n'}
            <span className="code-keyword">if</span> (
            <span className="code-variable">emailValid</span>) {'{\n'}
            {'  '}<span className="code-function">sendRecoveryLink</span>();{'\n'}
            {'}'}
          </code>
        </pre>
      </div>
    </motion.div>
  );
};

export default TechPanel;
