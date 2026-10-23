"use client";

import { useState, useEffect } from "react";
import type { DeviceCapabilities } from "../types/control-ingreso.types";

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    canScanQr: true,
    isMobile: false,
    hasCamera: true,
    helperText: "Cámara disponible para escaneo de códigos QR.",
    isQrBlocked: false,
    blockedMessage: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function detect() {
      // 1. Detección de dispositivo móvil / táctil
      const isTouch =
        typeof window !== "undefined" &&
        ((Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0) ||
          Boolean(
            typeof window.matchMedia === "function" &&
              window.matchMedia("(pointer: coarse)")?.matches
          ));

      const isNarrowScreen =
        typeof window !== "undefined" && window.innerWidth < 768;

      const isMobile = isTouch || isNarrowScreen;

      // 2. Detección de soporte de MediaDevices
      let hasCamera = true;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function"
        ) {
          if (typeof navigator.mediaDevices.enumerateDevices === "function") {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(
              (device) => device.kind === "videoinput"
            );
            // Permitir cámaras físicas y virtuales (DroidCam, Iriun, webcams USB)
            hasCamera = videoDevices.length > 0 || devices.length === 0;
          }
        }
      } catch {
        hasCamera = true;
      }

      const canScanQr = true; // Permitir siempre el intento para que el navegador solicite permisos
      const isQrBlocked = false;

      const blockedMessage = !hasCamera
        ? "No se detectó una cámara activa. Puedes conectar una webcam o utilizar una imagen de prueba."
        : "Cámara disponible para escaneo de códigos QR.";

      if (isMounted) {
        setCapabilities({
          canScanQr,
          isMobile,
          hasCamera,
          helperText: blockedMessage,
          isQrBlocked,
          blockedMessage,
        });
      }
    }

    detect();

    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.addEventListener === "function"
    ) {
      navigator.mediaDevices.addEventListener("devicechange", detect);
    }

    return () => {
      isMounted = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.removeEventListener === "function"
      ) {
        navigator.mediaDevices.removeEventListener("devicechange", detect);
      }
    };
  }, []);

  return capabilities;
}
