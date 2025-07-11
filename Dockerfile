# === Tahap 1: Build ===
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package dan install dependencies
COPY package*.json ./
RUN npm ci

# Copy seluruh kode dan build
COPY . .
RUN npm run build

# === Tahap 2: Runtime ===
FROM node:18-alpine AS runner
WORKDIR /app

# Hanya ambil hasil build + node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port (Vercel akan override jika perlu)
EXPOSE 3000

# Jalankan NestJS
CMD ["node", "dist/main.js"]
