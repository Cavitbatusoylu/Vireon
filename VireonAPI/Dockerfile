# Use the official .NET ASP.NET 10.0 runtime as a base image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080

# Use the official .NET 10.0 SDK for building the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["VireonAPI.csproj", "./"]
RUN dotnet restore "VireonAPI.csproj"

COPY . .
WORKDIR "/src/"
RUN dotnet build "VireonAPI.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "VireonAPI.csproj" -c Release -o /app/publish

# Copy to final image running in Google Cloud Run
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "VireonAPI.dll"]
