# Prenos na novi hosting

Next.js aplikacija + PostgreSQL 18 u Dockeru. `docker-compose.yml` pokreće **samo bazu**.

Na serveru treba: Docker sa Compose v2, Node.js 22+, bash i HTTPS domen (push notifikacije rade samo preko HTTPS-a).

## 1. `.env`

Uzmi stari `.env` od Živorada (bezbednim kanalom, ne preko gita) i dodaj/izmeni:

```bash
POSTGRES_USER=brezna
POSTGRES_PASSWORD=        # openssl rand -hex 24
POSTGRES_DB=brezna_obrok
DATABASE_URL=postgresql://brezna:LOZINKA@127.0.0.1:5432/brezna_obrok
NEON_DATABASE_URL=        # stari DATABASE_URL sa Neona, samo za prenos
```

Vrednosti upiši bez komentara u istom redu. Ne menjati:

- `JWT_SECRET` – inače svi bivaju odjavljeni
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY` – inače prestaju push notifikacije. Javni ključ mora da postoji i **tokom build-a**.

`CRON_SECRET` je takođe obavezan. Ako se domen promeni, korisnici moraju ponovo da se prijave i uključe notifikacije.

## 2. Prenos baze

Neon mora da prihvata konekcije. Ako je kvota potrošena, prenos nije moguć dok se plan ne podigne ili kvota ne obnovi.

1. Ugasi staru aplikaciju, da niko ne upisuje tokom prenosa.
2. `bash scripts/prenos-sa-neona.sh`

Skripta podigne bazu, prekopira šemu i podatke i uporedi broj redova po tabelama. Neon samo čita, a ako nova baza nije prazna, odbija da radi.
**Ne pokretati `db:push`, `db:migrate` ni `db:seed` pre prenosa** – šema stiže zajedno sa podacima.

Posle prenosa: `npm ci && npm run db:push`. Očekivano je da nema izmena. Ako nešto predloži, pročitaj SQL; `DROP` ne potvrđuj.

## 3. Aplikacija

```bash
npm ci
npm run build
TZ=UTC npm run start     # port 3000, pod systemd/pm2, iza reverse proxy-ja sa HTTPS-om
```

`TZ=UTC` je kao na Vercelu; rokovi se sami računaju po Beogradu. Proxy treba da prosledi `Host` i `X-Forwarded-Proto`.

## 4. Cron

`vercel.json` važi samo na Vercelu. Na serveru (vremena su UTC; zameni `TAJNA` i `DOMEN`):

```cron
0 7 * * 1    curl -fsS -H "Authorization: Bearer TAJNA" https://DOMEN/api/cron/debt-reminders
0 * * * *    curl -fsS -H "Authorization: Bearer TAJNA" https://DOMEN/api/cron/order-reminders
```

Podsetnik se zove na svaki sat, a aplikacija sama šalje od 11h, jednom dnevno, po Beogradu.

Ugasi stari spoljni scheduler (npr. cron-job.org) ako zove staru adresu.

## 5. Backup

Neon više ne čuva kopije. Pokreći svaki dan i kopiraj fajl van servera:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/baza-$(date +%F).dump
```

`docker compose down -v` **briše bazu**. Običan `docker compose down` je bezbedan.

## Na kraju

Proveri prijavu, porudžbine, `/dug` i admin. Zatim obriši `NEON_DATABASE_URL` iz `.env`; Neon projekat ostavi još neko vreme kao rezervu.
