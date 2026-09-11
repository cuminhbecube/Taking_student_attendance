FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npm run prisma:migrate:deploy && node dist/server.js"]
