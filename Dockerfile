# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.24-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config and built app to /app (same path as Nixpacks)
COPY nginx.conf /app/nginx.conf
COPY --from=builder /app/build /app/build

EXPOSE 80

CMD ["nginx", "-c", "/app/nginx.conf", "-g", "daemon off;"]
