"""NeuroFace backend application package.

This file marks the `app` folder as a regular Python package. Without it,
Python treats `app` as a "namespace package", and the sibling file
`backend/app.py` (the Gradio landing page) would shadow the whole
`app.api`, `app.models`, ... package tree, making `import app.main` fail.
"""

__all__ = []
