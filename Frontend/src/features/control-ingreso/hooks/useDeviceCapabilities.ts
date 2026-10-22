"use client";

import { useState, useEffect } from "react";
import type { DeviceCapabilities } from "../types/control-ingreso.types";

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    canScanQr: false,
    isMobile: false,
    hasCamera: false,
    helperText: "No se detectó una cámara disponible en este dispositivo.",
    isQrBlocked: true,
    blockedMessage: "No se detectó una cámara disponible en este dispositivo.",
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

      // 2. Detección de cámara física disponible
      let hasCamera = false;
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

            // Filtrar dispositivos virtuales comunes si tienen etiqueta explícita
            const nonVirtualDevices = videoDevices.filter(
              (device) =>
                !device.label ||
                !/obs|virtual|dummy|v4l2loopback|fake|manycam|droidcam|iriun/i.test(
                  device.label
                )
            );

            // Si hay dispositivos de video detectados (o aún sin etiquetas por permisos pendientes), o la API existe
            hasCamera = videoDevices.length === 0 ? true : nonVirtualDevices.length > 0;
          } else {
            hasCamera = true;
          }
        }
      } catch {
        hasCamera = true;
      }

      const canScanQr = hasCamera;
      const isQrBlocked = !canScanQr;

      const blockedMessage = !hasCamera
        ? "No se detectó una cámara disponible en este dispositivo."
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
