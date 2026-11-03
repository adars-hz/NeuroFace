FROM python:3.11-slim

# Install system dependencies including Tesseract OCR and OpenCV dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up user for Hugging Face Spaces & container security (user ID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

# Copy dependency list and install
COPY --chown=user backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend application files
COPY --chown=user backend/ .

# Expose ports for Hugging Face (7860) and Render/Cloud (10000 / 8000)
EXPOSE 7860
EXPOSE 10000
EXPOSE 8000

# Run FastAPI with dynamic port binding (defaults to 7860 for Hugging Face)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
