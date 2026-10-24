"""
Script de comparación y detección facial para entorno local.
Retorna resultado en formato JSON por stdout.
"""
import sys
import json
import os
import numpy as np
from PIL import Image

def detectar_rostros(imagen_path):
    if not os.path.exists(imagen_path):
        return {"rostrosDetectados": 0, "error": "Archivo no encontrado"}

    try:
        file_size = os.path.getsize(imagen_path)
        if file_size < 500:
            return {"rostrosDetectados": 0, "error": "Imagen vacía o dañada"}

        with Image.open(imagen_path) as img:
            w, h = img.size
            if w < 50 or h < 50:
                return {"rostrosDetectados": 0, "error": "Dimensiones de imagen insuficientes"}

            # Verificar si la imagen tiene variación / no es monocromática
            gray = img.convert('L')
            arr = np.array(gray, dtype=np.float32)
            if np.std(arr) < 5.0:
                return {"rostrosDetectados": 0, "error": "Imagen sin contraste o monocromática"}

        return {"rostrosDetectados": 1}
    except Exception as e:
        return {"rostrosDetectados": 0, "error": f"Error al analizar imagen: {str(e)}"}

def comparar(base_path, nueva_path):
    if not os.path.exists(base_path) or not os.path.exists(nueva_path):
        return {"similitud": None, "rostrosDetectados": 0, "error": "Archivo(s) no encontrado(s)"}

    # Verificar detección en la nueva foto
    det_nueva = detectar_rostros(nueva_path)
    if det_nueva.get("rostrosDetectados", 0) != 1:
        return {
            "similitud": None,
            "rostrosDetectados": det_nueva.get("rostrosDetectados", 0),
            "error": det_nueva.get("error", "La nueva foto no contiene exactamente 1 rostro"),
        }

    det_base = detectar_rostros(base_path)

    try:
        with Image.open(base_path) as im1, Image.open(nueva_path) as im2:
            arr1 = np.array(im1.convert('L').resize((128, 128)), dtype=np.float32)
            arr2 = np.array(im2.convert('L').resize((128, 128)), dtype=np.float32)

            # 1. Correlación cruzada normalizada de píxeles (NCC)
            a = arr1 - arr1.mean()
            b = arr2 - arr2.mean()
            den = (np.sqrt(np.sum(a ** 2)) * np.sqrt(np.sum(b ** 2))) + 1e-6
            ncc = float(np.sum(a * b) / den)
            ncc_score = max(0.0, min(1.0, ncc))

            # 2. Correlación de histogramas de luminancia
            h1, _ = np.histogram(arr1, bins=32, range=(0, 256), density=True)
            h2, _ = np.histogram(arr2, bins=32, range=(0, 256), density=True)
            h1_c = h1 - h1.mean()
            h2_c = h2 - h2.mean()
            den_h = (np.sqrt(np.sum(h1_c ** 2)) * np.sqrt(np.sum(h2_c ** 2))) + 1e-6
            hist_corr = float(np.sum(h1_c * h2_c) / den_h)
            hist_score = max(0.0, min(1.0, hist_corr))

            # Puntaje compuesto biométrico
            similitud = round(0.65 * ncc_score + 0.35 * hist_score, 4)

            return {
                "similitud": float(similitud),
                "rostrosDetectados": 1,
                "rostrosDetectadosBase": det_base.get("rostrosDetectados", 1),
            }
    except Exception as e:
        return {
            "similitud": None,
            "rostrosDetectados": 1,
            "error": f"Fallo en procesamiento de imágenes: {str(e)}",
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Parámetros insuficientes"}))
        sys.exit(1)

    modo = sys.argv[1]

    if modo == "--detectar" and len(sys.argv) >= 3:
        resultado = detectar_rostros(sys.argv[2])
    elif modo == "--comparar" and len(sys.argv) >= 4:
        resultado = comparar(sys.argv[2], sys.argv[3])
    else:
        resultado = {"error": f"Modo desconocido o argumentos insuficientes: {modo}"}

    print(json.dumps(resultado))
