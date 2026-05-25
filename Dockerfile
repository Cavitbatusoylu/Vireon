FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Vireon.slnx ./
COPY Vireon.EntityLayer/Vireon.EntityLayer.csproj Vireon.EntityLayer/
COPY Vireon.DataAccessLayer/Vireon.DataAccessLayer.csproj Vireon.DataAccessLayer/
COPY Vireon.DtoLayer/Vireon.DtoLayer.csproj Vireon.DtoLayer/
COPY Vireon.BusinessLayer/Vireon.BusinessLayer.csproj Vireon.BusinessLayer/
COPY Vireon.PresentationLayer/Vireon.PresentationLayer.csproj Vireon.PresentationLayer/
RUN dotnet restore

COPY . .
RUN dotnet publish Vireon.PresentationLayer/Vireon.PresentationLayer.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

EXPOSE 5202
ENV ASPNETCORE_URLS=http://+:5202
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
COPY Vireon.PresentationLayer/wwwroot ./wwwroot

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5202/swagger/v1/swagger.json || exit 1

ENTRYPOINT ["dotnet", "Vireon.PresentationLayer.dll"]
