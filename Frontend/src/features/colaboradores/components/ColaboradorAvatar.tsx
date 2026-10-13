"use client";

interface ColaboradorAvatarProps {
  nombreCompleto: string;
  className?: string;
}

export function ColaboradorAvatar({ nombreCompleto, className = "" }: ColaboradorAvatarProps) {
  const getInitials = (name: string): string => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(nombreCompleto);

  return (
    <div
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#e6edf7] text-[#003770] font-bold flex items-center justify-center text-sm tracking-wide shrink-0 ${className}`}
      aria-label={nombreCompleto}
    >
      {initials}
    </div>
  );
}
