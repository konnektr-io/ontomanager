# Stage 1: Build the frontend
FROM node:20 AS frontend-builder
WORKDIR /app/client

# Set environment variables for the frontend build
ARG GITHUB_CLIENT_ID
ARG GITHUB_REDIRECT_URI
ENV VITE_GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV VITE_GITHUB_REDIRECT_URI=$GITHUB_REDIRECT_URI

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY client/package*.json ./
RUN pnpm install

# Copy the rest of the frontend code and build it
COPY client/ ./
RUN pnpm run build

# Stage 2: Build the backend
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY OntoManager/*.csproj ./
RUN dotnet restore
COPY OntoManager/ ./
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=frontend-builder /app/client/dist ./wwwroot

# Create a non-root user and switch to it
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

# Set environment variables for the backend
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "OntoManager.dll"]