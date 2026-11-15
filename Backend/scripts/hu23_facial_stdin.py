"""YuNet + SFace, images exclusively from stdin. Never writes image files."""
import base64
import json
from pathlib import Path
import sys
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent / 'models'

def feature(encoded, detector, recognizer):
    raw = base64.b64decode(encoded, validate=True)
    if len(raw) > 2097152:
        raise ValueError()
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None or min(image.shape[:2]) < 80 or image.shape[0] * image.shape[1] > 16000000:
        raise ValueError()
    scale = min(1, 1280 / max(image.shape[:2]))
    if scale < 1:
        image = cv2.resize(image, None, fx=scale, fy=scale)
    detector.setInputSize((image.shape[1], image.shape[0]))
    _, faces = detector.detect(image)
    count = 0 if faces is None else len(faces)
    if count != 1:
        return count, None
    if min(faces[0][2:4]) < 40:
        raise ValueError()
    return count, recognizer.feature(recognizer.alignCrop(image, faces[0]))

def run(data):
    detector = cv2.FaceDetectorYN.create(str(ROOT / 'face_detection_yunet_2023mar.onnx'), '', (320,320), 0.9)
    recognizer = cv2.FaceRecognizerSF.create(str(ROOT / 'face_recognition_sface_2021dec.onnx'), '')
    if data['modo'] == 'salud':
        return {'disponible': True, 'motor': 'YuNet + SFace', 'opencv': cv2.__version__}
    count, current = feature(data['nueva'], detector, recognizer)
    result = {'rostrosDetectados': count, 'similitud': None}
    if data['modo'] == 'detectar':
        return result
    count_base, reference = feature(data['base'], detector, recognizer)
    result['rostrosDetectadosBase'] = count_base
    if current is not None and reference is not None:
        result['similitud'] = float(recognizer.match(reference, current, cv2.FaceRecognizerSF_FR_COSINE))
    return result

if __name__ == '__main__':
    cv2.setNumThreads(1)
    try:
        raw = sys.stdin.buffer.read(6 * 1024 * 1024 + 1)
        if len(raw) > 6 * 1024 * 1024:
            raise ValueError()
        result = run(json.loads(raw))
    except ValueError:
        result = {'error': 'IMAGEN_INVALIDA', 'rostrosDetectados': 0, 'similitud': None}
    except Exception:
        result = {'error': 'MOTOR_NO_DISPONIBLE', 'rostrosDetectados': 0, 'similitud': None}
    print(json.dumps(result, allow_nan=False))
