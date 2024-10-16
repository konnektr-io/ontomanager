# Stage 1: Build the frontend
FROM node:20 AS frontend-builder
WORKDIR /app/client

# Set environment variables for the frontend build
ARG VITE_GITHUB_CLIENT_ID
ARG VITE_GITHUB_REDIRECT_URI

# Pass the environment variables to the build process
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
ENV VITE_GITHUB_REDIRECT_URI=$VITE_GITHUB_REDIRECT_URI

COPY client/package*.json ./
RUN pnpm install
COPY client/ ./
RUN pnpm run build

# Stage 2: Build the backend
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY OntoManager/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=frontend-builder /app/client/build ./wwwroot
ENTRYPOINT ["dotnet", "OntoManager.dll"]