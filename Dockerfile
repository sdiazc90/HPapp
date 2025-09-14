# Usamos Node.js 20 Alpine (ligero y compatible con Render)
FROM --platform=linux/amd64 node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos todo el proyecto
COPY . .

# Exponemos el puerto que Render asignará
EXPOSE 10000

# Comando para iniciar la app
CMD ["node", "server.js"]

