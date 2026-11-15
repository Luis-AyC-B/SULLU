"""Download the official OpenCV models without storing them in Git."""
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent / 'models'
MODELS = {
    'face_detection_yunet_2023mar.onnx': 'face_detection_yunet',
    'face_recognition_sface_2021dec.onnx': 'face_recognition_sface',
}

if __name__ == '__main__':
    ROOT.mkdir(exist_ok=True)
    for filename, folder in MODELS.items():
        target = ROOT / filename
        if target.exists():
            continue
        url = f'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/{folder}/{filename}'
        with urlopen(url, timeout=120) as response:
            data = response.read()
        if len(data) < 10000 or data.startswith(b'version https://git-lfs'):
            raise RuntimeError(f'Invalid model download: {filename}')
        target.write_bytes(data)
        print(f'Downloaded {filename}')
