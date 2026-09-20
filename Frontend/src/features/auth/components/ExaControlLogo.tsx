import React from 'react';

interface ExaControlLogoProps {
  className?: string;
  color?: string;
  size?: number | string;
}

/**
 * Logotipo oficial de ExaControl basado en los mockups institucionales.
 * Representa los corchetes geométricos y el núcleo central de control.
 */
export function ExaControlLogo({
  className = 'h-16 w-20',
  color = '#E30613',
}: ExaControlLogoProps) {
  return (
    <svg
      viewBox="0 0 100 80"
      className={className}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logotipo ExaControl"
    >
      {/* Corchete izquierdo [ */}
      <path d="M 38 8 H 10 V 72 H 38 V 56 H 24 V 24 H 38 Z" />
      {/* Corchete derecho ] */}
      <path d="M 62 8 H 90 V 72 H 62 V 56 H 76 V 24 H 62 Z" />
      {/* Núcleo / Cuadrado central ■ */}
      <rect x="42" y="32" width="16" height="16" />
    </svg>
  );
}
