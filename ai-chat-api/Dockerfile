# 1. Imagen base actualizada a Node 22
FROM node:22-alpine

# 2. Carpeta de trabajo
WORKDIR /app

# 3. Instalamos pnpm globalmente
RUN npm install -g pnpm

# 4. Copiamos package.json y el lock de pnpm (si existe)
COPY package.json pnpm-lock.yaml* ./

# 5. Instalamos las dependencias con pnpm
RUN pnpm install

# 6. Copiamos el resto del código
COPY . .

# 7. Exponemos el puerto de tu API
EXPOSE 3000

# 8. Comando para arrancar la app
CMD ["pnpm", "start"]