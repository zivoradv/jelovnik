# Jelovnik — aplikacija za naručivanje obroka

Jednostavna web aplikacija koja zamenjuje naručivanje obroka preko Viber grupe.
Administratori unose dnevni meni (šta se jede kog dana), a korisnici biraju
obrok za željeni radni dan. Vikendom se ne radi, pa su subota i nedelja isključeni.

Napravljeno sa **Next.js + TypeScript + React + MUI**, baza preko **Drizzle ORM**
(PostgreSQL), autorizacija preko **JWT** tokena u `httpOnly` kolačiću.

## Mogućnosti

- Prijava / registracija (ime, prezime i jedinstveno korisničko ime)
- Uloge: **administrator** i **korisnik**
- **Nedeljne šeme**: administrator pravi imenovane šeme (koja kuvana jela su u ponudi Pon–Pet) i dodeljuje ih nedeljama;
  šema se može ponovo koristiti, kopirati i menjati. Suvi obroci su uvek u ponudi.
- Korisnik bira obrok za bilo koji radni dan; može izabrati i više porcija
- **Čorba**: uz kuvano jelo je uključena; uz suvi obrok se dodaje po izboru (+100 RSD, podesivo)
- **Popust firme**: firma pokriva deo cene jedne porcije dnevno – procenat ili fiksan iznos u dinarima (podesivo); svaka dodatna porcija se plaća u celosti
- **Rok za naručivanje**: najkasnije dan ranije do 17:00 (Europe/Belgrade); za isti dan se ne može naručiti
- **Pivo 🍺**: stranica `/pivo` – predlozi (datum, vreme, mesto), ko ide / ne ide, obaveštenja kad neko predloži ili se prijavi;
  u kafanskom modu (7× klik na logo) povremeno iskače pitanje „Pivo?” sa Da/Ne
- **Sopstvena porudžbina** — ako mu ništa ne odgovara, upiše šta želi
- **Dodatak / napomena** uz kuvano jelo (npr. „bez luka“); suvi obrok nema napomenu
- **Dugovi**: administrator evidentira uplate (po danu ili sve odjednom); korisnik vidi status svog duga
- **Obaveštenja** (zvonce): automatski za objavljen/izmenjen raspored, izmenjeno ili uklonjeno jelo,
  evidentiranu uplatu i podsetnik za dug (cron ponedeljkom + ručno); admin može poslati i poruku svima
- **Profil**: izmena imena, prezimena, korisničkog imena i lozinke
- Broj glasova po jelu vidljiv svima; administrator vidi **ko je šta poručio** i **ukupne količine**
- Izvoz porudžbina: dugme **„Za dostavljača“ / „Detaljno“** (za lepljenje u Viber/štampu) i **CSV**
- **Svetla / tamna tema**
- Aplikacija je na **srpskom** jeziku

## Tehnologije

| Sloj        | Alat                                             |
| ----------- | ------------------------------------------------ |
| Framework   | Next.js 16 (App Router)                           |
| Jezik       | TypeScript                                        |
| UI          | React 19 + MUI (Material UI) v9                   |
| Baza        | PostgreSQL (Neon / Supabase / Vercel Postgres…)  |
| ORM         | Drizzle                                           |
| Autorizacija| JWT (`jose`) + bcrypt (`bcryptjs`)               |

## Struktura projekta

```
drizzle/         # šema baze (schema.ts) i klijent (index.ts)
services/        # poslovna logika i pristup bazi
lib/             # pomoćne funkcije (auth, jwt, datumi, konstante)
app/             # frontend (App Router) + API rute
  api/           #   API rute (auth, meals, orders, admin)
  components/    #   deljene komponente (NavBar, ThemeToggle)
  admin/         #   administratorske stranice
scripts/seed.ts  # početni podaci (admin + meni + osnovna šema)
vercel.json      # cron za podsetnik o dugovima
proxy.ts         # provera JWT tokena na svakoj ruti
```

## Besplatna baza (preporuka)

1. Napravi besplatan nalog na **[Neon](https://neon.tech)** (PostgreSQL, izdašan free tier).
2. Napravi projekat i kopiraj *connection string* (izgleda kao
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`).

Radi i sa Supabase, Vercel Postgres ili bilo kojim PostgreSQL URL-om.

## Pokretanje lokalno

```bash
# 1. Instaliraj zavisnosti
npm install

# 2. Napravi .env (kopiraj primer i popuni)
cp .env.example .env
#   - DATABASE_URL = tvoj Postgres URL
#   - JWT_SECRET   = dugačak nasumičan string (openssl rand -base64 48)
#   - CRON_SECRET  = još jedan nasumičan string (štiti /api/cron/debt-reminders)

# 3. Napravi tabele u bazi
npm run db:push

# 4. Ubaci početne podatke (admin nalog + meni)
npm run db:seed

# 5. Pokreni aplikaciju
npm run dev
```

Aplikacija je na `http://localhost:3000`.
Podrazumevani admin: `admin` / `admin123` (promeni preko `.env` ili posle prijave).

## Skripte

| Komanda              | Opis                                     |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Razvojni server                          |
| `npm run build`      | Produkciona verzija                      |
| `npm run start`      | Pokretanje produkcione verzije           |
| `npm run db:push`    | Primeni šemu na bazu (bez migracija)     |
| `npm run db:generate`| Generiši SQL migracije                   |
| `npm run db:migrate` | Primeni migracije                        |
| `npm run db:studio`  | Drizzle Studio (pregled baze)            |
| `npm run db:seed`    | Početni podaci                           |
| `npm run db:reset -- --yes` | Obriše CELU bazu (tabele + migracije); zatim `db:migrate` i `db:seed` |

## Objavljivanje (deploy)

Najlakše preko **[Vercel](https://vercel.com)**:

1. Postavi kod na GitHub.
2. Uveži repozitorijum na Vercel.
3. U podešavanjima projekta dodaj `DATABASE_URL`, `JWT_SECRET` i `CRON_SECRET` (Vercel Cron ga automatski šalje ruti za podsetnik).
4. Deploy. (Tabele napravi jednom sa `npm run db:push` lokalno, uperено na istu bazu.)

## Objavljivanje na GitHub-u

```bash
git init
git add .
git commit -m "Prva verzija"
git branch -M main
git remote add origin https://github.com/<korisnik>/<repo>.git
git push -u origin main
```

`.env` je u `.gitignore` — tajne se ne šalju na GitHub.

## Predlozi za dalje (opciono)

- Rok za poručivanje (npr. do 10h dan ranije) sa automatskim zaključavanjem
- „Iskopiraj prošlu nedelju“ za brzo unošenje menija
- Označavanje jela kao „rasprodato“
- Istorija porudžbina po korisniku
- Podsetnik (email/push) da se poruči obrok
- Slike jela
- Praznici / neradni dani koje admin ručno isključi

## Nadogradnja postojeće baze (v2)

Migracija `drizzle/migrations/0003_jelovnik_v2.sql` dodaje tabele za šeme, nedelje, obaveštenja i podešavanja,
kolone `first_name` / `last_name` na korisnicima i `with_soup` na porudžbinama, a briše `meals.day`.
Pre brisanja kolone, postojeći raspored po danima se čuva kao šema **„Postojeća šema“** i dodeljuje tekućoj nedelji.

```bash
npm run db:migrate   # ili db:push ako ne koristiš migracije (tada se stari raspored NE prenosi u šemu)
```

Posle migracije postojeći korisnici imaju prazno ime i prezime — neka ih unesu na stranici **Profil**.
