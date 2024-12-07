# Stage 1: Build the frontend
FROM node:20 AS frontend-builder
WORKDIR /app/client

# Set environment variables for the frontend build
ARG GA_MEASUREMENT_ID
ENV VITE_GA_MEASUREMENT_ID=$GA_MEASUREMENT_ID

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY client/package*.json ./
RUN pnpm install

# Copy the rest of the frontend code and build it
COPY client/ ./
RUN pnpm run build

# Stage 2: Build the final image
FROM python:3.11-slim AS final
WORKDIR /app

# Copy the backend code and requirements
COPY app/requirements.txt ./
COPY app/ ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy the frontend build output
COPY --from=frontend-builder /app/client/dist /app/static

# Create a non-root user and switch to it
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

# Set environment variables for the backend
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8080
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Run the Flask application with gunicorn
ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]