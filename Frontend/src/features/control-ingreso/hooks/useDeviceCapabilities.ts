"use client";

import { useState, useEffect } from "react";
import type { DeviceCapabilities } from "../types/control-ingreso.types";

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    canScanQr: false,
    isMobile: false,
    hasCamera: false,
    helperText: "Verificando capacidades del dispositivo...",
    isQrBlocked: true,
    blockedMessage: "Verificando capacidades del dispositivo...",
  });

  useEffect(() => {
    async function detect() {
      // 1. Detección de dispositivo móvil / táctil
      const isTouch =
        typeof window !== "undefined" &&
        ((Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0) ||
          Boolean(typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)")?.matches));

      const isNarrowScreen =
        typeof window !== "undefined" && window.innerWidth < 768;

      const isMobile = isTouch || isNarrowScreen;

      // 2. Detección de cámara física disponible
      let hasCamera = false;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.enumerateDevices
        ) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasCamera = devices.some((device) => device.kind === "videoinput");
        }
      } catch {
        hasCamera = false;
      }

      // Si es mobile pero enumerateDevices no listó dispositivos por falta de permisos iniciales,
      // asumimos que el móvil cuenta con cámara integrada
      if (isMobile && !hasCamera && navigator.mediaDevices) {
        hasCamera = true;
      }

      const canScanQr = isMobile && hasCamera;
      const isQrBlocked = !canScanQr;

      const blockedMessage = !isMobile
        ? "El escaneo QR requiere la cámara. Ingresa desde un dispositivo móvil."
        : !hasCamera
        ? "No se detectó una cámara disponible en este dispositivo."
        : "Cámara disponible para escaneo de códigos QR.";

      setCapabilities({
        canScanQr,
        isMobile,
        hasCamera,
        helperText: blockedMessage,
        isQrBlocked,
        blockedMessage,
      });
    }

    detect();
  }, []);

  return capabilities;
}
