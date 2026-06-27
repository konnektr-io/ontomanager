# Stage 1: Build the frontend
FROM node:22-slim AS frontend-builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.20.0
WORKDIR /app/frontend

# Set environment variables for the frontend build
ARG GTM_ID
ENV VITE_GTM_ID=$GTM_ID

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN pnpm install

# Copy the rest of the frontend code and build it
COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build the final image
FROM python:3.12-slim AS final
WORKDIR /app

# Copy the backend code and requirements
COPY app/requirements.txt ./
COPY app/ ./


# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the frontend build output
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create a non-root user and switch to it
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser


# Set environment variables for the backend
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Run the FastAPI application with uvicorn
ENTRYPOINT ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]