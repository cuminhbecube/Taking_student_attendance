# Production deployment

## 1. Requirements
- Docker Engine + Docker Compose v2
- A Linux host with persistent disk
- HTTPS handled by a reverse proxy/load balancer in front of this stack

## 2. Configure environment
```bash
cp .env.production.example .env
```
Set strong unique values for:
- `POSTGRES_PASSWORD`
- `JWT_SECRET` (at least 32 random characters)
- `CORS_ORIGIN` to the public HTTPS origin

Do not deploy demo credentials from `prisma/seed.ts` to production.

## 3. Start
```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```
The API container runs `prisma migrate deploy` before starting Fastify.
The public web port defaults to `8080` and can be changed with `WEB_PORT`.

## 4. Verify
```bash
curl -f http://127.0.0.1:${WEB_PORT:-8080}/healthz
curl -f http://127.0.0.1:${WEB_PORT:-8080}/
docker compose --env-file .env -f docker-compose.prod.yml ps
```

## 5. Database migrations
Development:
```bash
cd server
npm run prisma:migrate -- --name <migration-name>
```
Production:
```bash
cd server
npm run prisma:migrate:deploy
```
Never use `prisma db push` as the production deployment mechanism.

## 6. Backup
```bash
set -a; . ./.env; set +a
sh deploy/backup.sh
```
Backups are written to `./backups` by default. Copy them to separate storage and test restoration periodically.

## 7. Restore
Stop the web/API writers first, then run:
```bash
set -a; . ./.env; set +a
sh deploy/restore.sh backups/attendance_<timestamp>.sql.gz
```
The restore command requires typing `RESTORE` to continue.

## 8. Upgrade procedure
1. Take a database backup.
2. Pull the reviewed release/commit.
3. Run `docker compose ... build`.
4. Run `docker compose ... up -d`.
5. API applies pending Prisma migrations before accepting traffic.
6. Verify `/healthz`, login, tenant isolation, attendance write, and tuition read/write.
7. Keep the previous application image/tag available for rollback. Database rollback must be planned migration-by-migration; never blindly reverse destructive schema changes.

## 9. HTTPS
This compose file intentionally exposes plain HTTP on the host. Put Caddy, Nginx, Traefik, Cloudflare Tunnel, or another TLS terminator in front of `WEB_PORT`. Only publish HTTPS to the Internet.

## 10. Production security checklist
- Unique database password and JWT secret
- HTTPS only
- No demo accounts/passwords
- PostgreSQL port not publicly exposed
- Daily automated backups + off-host copy
- Audit log retention policy
- OS/Docker security updates
- Review `npm audit` and CI before each release
- Restrict host SSH/firewall access
