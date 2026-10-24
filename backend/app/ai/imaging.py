"""Helpers for turning uploaded pictures into arrays OpenCV can work with."""

import base64
import cv2
import numpy as np


def decode_base64_image(image_base64: str) -> np.ndarray:
    """Turn a base64 (optionally data-URL) encoded picture into a BGR array.

    Raises ValueError when the data cannot be read as an image.
    """
    encoded = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
    image_bytes = base64.b64decode(encoded)
    frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Empty image")
    return frame
