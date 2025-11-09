# Usar una imagen base de Python oficial y ligera
FROM python:3.9-slim

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar el archivo de requerimientos primero para aprovechar el cache de Docker
COPY requirements.txt .
RUN pip --default-timeout=100 install --no-cache-dir -r requirements.txt

# Copiar el resto de los archivos de la aplicación
COPY . .

# Comando por defecto para ejecutar la aplicación. Se espera que se le pase un argumento.
CMD ["python", "app.py"]