"""Optional Gradio landing page for Hugging Face Spaces.

The real application is the FastAPI app in `app/main.py` - that is what the
Dockerfile starts. This file only puts a small landing page in front of it and
is used when the project runs as a Hugging Face Space.

Gradio is optional, so when it is not installed this file simply exposes the
plain FastAPI app.
"""

from app.main import app as fastapi_app


def build_landing_page():
    """Return the FastAPI app with a small Gradio landing page mounted on it."""
    import gradio as gr

    with gr.Blocks(title="NeuroFace Backend API") as demo:
        gr.Markdown(
            """
            # 🧠 NeuroFace AI Attendance Management System
            ### Backend API Service is Running Online!

            - **FastAPI Documentation:** [Open Swagger Docs](/docs)
            - **API Base URL:** `/api/v1`
            - **Status:** Operational
            """
        )

    # Mounting Gradio keeps all /api/v1 and /docs routes active.
    return gr.mount_gradio_app(fastapi_app, demo, path="/")


try:
    app = build_landing_page()
except ImportError:
    # Gradio is not installed - run the plain FastAPI application.
    app = fastapi_app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
