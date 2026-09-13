# Jelovnik — aplikacija za naručivanje obroka

Jednostavna web aplikacija koja zamenjuje naručivanje obroka preko Viber grupe.
Administratori unose dnevni meni (šta se jede kog dana), a korisnici biraju
obrok za željeni radni dan. Vikendom se ne radi, pa su subota i nedelja isključeni.

Napravljeno sa **Next.js + TypeScript + React + MUI**, baza preko **Drizzle ORM**
(PostgreSQL), autorizacija preko **JWT** tokena u `httpOnly` kolačiću.

## Mogućnosti

- Prijava / registracija ()
- Uloge: **administrator** i **korisnik**
- Administrator: dodaje/menja/briše jela po danima (Pon–Pet), suvi obrok dostupan svaki dan
- Svako jelo ima i **pomoćnu napomenu** (interna/dodatna informacija, vidljiva korisnicima)
- Korisnik bira obrok za bilo koji radni dan; može izabrati i **dva jela**
- **Sopstvena porudžbina** — ako mu ništa ne odgovara, upiše šta želi
- **Dodatak / napomena** uz svako izabrano jelo (npr. „bez luka“)
- Broj glasova po jelu vidljiv svima; administrator vidi **ko je šta poručio** i **ukupne količine**
- Izvoz porudžbina: dugme **„Kopiraj rezime“** (za lepljenje u Viber/štampu) i **CSV**
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
scripts/seed.ts  # početni podaci (admin + meni iz PDF-a)
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

## Objavljivanje (deploy)

Najlakše preko **[Vercel](https://vercel.com)**:

1. Postavi kod na GitHub.
2. Uveži repozitorijum na Vercel.
3. U podešavanjima projekta dodaj `DATABASE_URL` i `JWT_SECRET`.
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
