FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Vireon.slnx ./
COPY src/Vireon.EntityLayer/Vireon.EntityLayer.csproj src/Vireon.EntityLayer/
COPY src/Vireon.DataAccessLayer/Vireon.DataAccessLayer.csproj src/Vireon.DataAccessLayer/
COPY src/Vireon.DtoLayer/Vireon.DtoLayer.csproj src/Vireon.DtoLayer/
COPY src/Vireon.BusinessLayer/Vireon.BusinessLayer.csproj src/Vireon.BusinessLayer/
COPY src/Vireon.PresentationLayer/Vireon.PresentationLayer.csproj src/Vireon.PresentationLayer/
RUN dotnet restore

COPY . .
RUN dotnet publish src/Vireon.PresentationLayer/Vireon.PresentationLayer.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

EXPOSE 5202
ENV ASPNETCORE_URLS=http://+:5202
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
COPY src/Vireon.PresentationLayer/wwwroot ./wwwroot

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5202/swagger/v1/swagger.json || exit 1

ENTRYPOINT ["dotnet", "Vireon.PresentationLayer.dll"]
