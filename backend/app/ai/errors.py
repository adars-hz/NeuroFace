"""Errors raised by the optional AI model layer.

The face models (MTCNN + ArcFace) need heavy optional dependencies such as
`facenet-pytorch`. If they are not installed we do NOT want the whole API to
crash on import - we want a clear, friendly message on the endpoints that
actually need a face model. So the AI modules raise this error and
`app/main.py` turns it into an HTTP 503 response.
"""


class AIModelUnavailableError(RuntimeError):
    """Raised when a face model or one of its dependencies is missing."""
