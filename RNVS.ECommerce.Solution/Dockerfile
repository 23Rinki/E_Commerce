# Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY RNVS.ECommerce.Domain/*.csproj RNVS.ECommerce.Domain/
COPY RNVS.ECommerce.Application/*.csproj RNVS.ECommerce.Application/
COPY RNVS.ECommerce.Infrastructure/*.csproj RNVS.ECommerce.Infrastructure/
COPY RNVS.ECommerce.API/*.csproj RNVS.ECommerce.API/
RUN dotnet restore RNVS.ECommerce.API/RNVS.ECommerce.API.csproj

COPY . .
RUN dotnet publish RNVS.ECommerce.API/RNVS.ECommerce.API.csproj -c Release -o /app/publish --no-restore

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build /app/publish .
RUN mkdir -p /app/wwwroot/uploads /app/wwwroot/receipts /app/Logs

ENTRYPOINT ["dotnet", "RNVS.ECommerce.API.dll"]
