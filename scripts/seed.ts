import 'dotenv/config';
import { db, users, meals } from '../drizzle';
import { hashPassword } from '../lib/password';

type SeedMeal = {
  name: string;
  description?: string;
  note?: string;
  price: string;
  day: number | null;
  category: 'kuvano' | 'suvo';
  isPosno?: boolean;
};

// Meni preuzet iz PDF-a "Jelovnik FAN".
const KUVANA: SeedMeal[] = [
  // Ponedeljak
  { name: 'Pljeskavica i pire krompir', price: '500', day: 1, category: 'kuvano' },
  { name: 'Grašak sa junetinom', price: '500', day: 1, category: 'kuvano' },
  // Utorak
  { name: 'Ćufte i makarone', price: '500', day: 2, category: 'kuvano' },
  { name: 'Pilav', price: '500', day: 2, category: 'kuvano' },
  { name: 'Sataraš', price: '500', day: 2, category: 'kuvano', isPosno: true },
  // Sreda
  { name: 'Sataraš i roštiljska kobasica', price: '500', day: 3, category: 'kuvano' },
  { name: 'Boranija sa svinjetinom', price: '500', day: 3, category: 'kuvano' },
  // Četvrtak
  { name: 'Lovačka šnicla i pire krompir', price: '500', day: 4, category: 'kuvano' },
  { name: 'Pasta piletina sa 4 vrste sira', price: '500', day: 4, category: 'kuvano' },
  // Petak
  { name: 'Sarma', price: '500', day: 5, category: 'kuvano' },
  { name: 'Špagete bolonjez', price: '500', day: 5, category: 'kuvano' },
  { name: 'Sarma (posno)', price: '500', day: 5, category: 'kuvano', isPosno: true },
];

const SUVA: SeedMeal[] = [
  { name: 'Jaja na oko i viršle', price: '400', day: null, category: 'suvo' },
  { name: 'Kajgana', price: '400', day: null, category: 'suvo' },
  { name: 'Kačamak', price: '400', day: null, category: 'suvo' },
  {
    name: 'Sendvič kulen',
    description: 'pavlaka, kečap, majonez, kiseli krastavčići, kuvano jaje',
    price: '400',
    day: null,
    category: 'suvo',
  },
  {
    name: 'Sendvič pršuta',
    description: 'kajmak, kečap, kuvano jaje',
    price: '400',
    day: null,
    category: 'suvo',
  },
  {
    name: 'Sendvič čajna',
    description: 'pavlaka, kečap, majonez, kuvano jaje',
    price: '400',
    day: null,
    category: 'suvo',
  },
  {
    name: 'Sendvič šunka',
    description: 'pavlaka, kečap, majonez',
    price: '400',
    day: null,
    category: 'suvo',
  },
  {
    name: 'Sendvič hrskava piletina',
    description: 'pavlaka, kečap, majonez, kupus',
    price: '400',
    day: null,
    category: 'suvo',
  },
  { name: 'Sendvič tunjevina', price: '400', day: null, category: 'suvo' },
  {
    name: 'Sarajevski ćevapi u lepinji',
    description: 'kajmak, kupus salata',
    price: '400',
    day: null,
    category: 'suvo',
  },
  { name: 'Kroasan prazan 2/1 + jogurt', price: '400', day: null, category: 'suvo' },
  { name: 'Kroasan šunka sir 2/1 + jogurt', price: '400', day: null, category: 'suvo' },
  { name: 'Gibanica', price: '400', day: null, category: 'suvo' },
];

async function main() {
  console.log('▶ Pokretanje seed-a…');

  // 1) Admin nalog
  const existing = await db.select().from(users).limit(1);
  if (existing.length === 0) {
    const username = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const hash = await hashPassword(password);
    await db.insert(users).values({ username, password: hash, role: 'admin' });
    console.log(`✔ Kreiran administrator: ${username} / ${password}`);
    console.log('  (Obavezno promenite lozinku posle prve prijave.)');
  } else {
    console.log('• Korisnici već postoje — preskačem kreiranje admina.');
  }

  // 2) Jela
  const existingMeals = await db.select().from(meals).limit(1);
  if (existingMeals.length === 0) {
    await db.insert(meals).values([...KUVANA, ...SUVA]);
    console.log(`✔ Uneto ${KUVANA.length + SUVA.length} jela iz menija.`);
  } else {
    console.log('• Jela već postoje — preskačem unos menija.');
  }

  console.log('✅ Gotovo.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Greška u seed-u:', err);
  process.exit(1);
});
