# Multi-stage build para Node.js otimizado para EasyPanel
FROM node:20.9.0-alpine AS builder

WORKDIR /usr/src/app

# Copiar arquivos de dependências para melhor cache
COPY package*.json ./

# Instalar todas as dependências (incluindo dev)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (frontend + backend)
RUN npm run build

# Stage de produção
FROM node:20.9.0-alpine AS production

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copiar aplicação buildada do stage anterior
COPY --from=builder /usr/src/app/dist ./dist

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S slapy -u 1001

# Definir ownership correto
RUN chown -R slapy:nodejs /usr/src/app
USER slapy

# Expor a porta que a aplicação usa
EXPOSE 5000

# Health check para EasyPanel
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 5000, timeout: 2000 }; const request = http.request(options, (res) => { console.log('Health check passed'); process.exit(0); }); request.on('error', (err) => { console.log('Health check failed'); process.exit(1); }); request.end();"

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]