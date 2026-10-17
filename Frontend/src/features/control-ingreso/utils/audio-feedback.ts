/**
 * Utilidad de señal sonora y háptica para validaciones de ingreso (HU8).
 * Utiliza Web Audio API nativo para sintetizar un tono de éxito sin depender de archivos de audio externos.
 */

export function playSuccessChime(): void {
  try {
    if (typeof window === "undefined") return;

    // Vibración háptica en dispositivos móviles compatibles
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([80, 40, 80]);
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Crear dos osciladores para un acorde de confirmación agradable (D mayor / G mayor)
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Nota 1: 587.33 Hz (D5) -> 880 Hz (A5)
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    // Nota 2: armonía 880 Hz -> 1174.66 Hz (D6)
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Si el navegador bloquea audio sin interacción previa, ignorar silenciosamente
  }
}
