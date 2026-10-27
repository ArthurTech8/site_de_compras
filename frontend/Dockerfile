# Build do Vue com Node; a imagem final é só o nginx servindo os arquivos estáticos.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL vazio: o site chama /api no mesmo endereço e o nginx repassa para o backend.
RUN VITE_API_URL= npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
