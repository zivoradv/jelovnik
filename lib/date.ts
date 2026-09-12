// Pomoćne funkcije za rad sa datumima, nezavisne od vremenske zone.
// Datumi se čuvaju kao string 'YYYY-MM-DD'.

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Ponedeljak nedelje kojoj pripada dati datum.
export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = nedelja
  const diff = day === 0 ? -6 : 1 - day; // vrati na ponedeljak
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Niz od 5 radnih dana (Pon–Pet) za nedelju kojoj pripada dati datum.
export function workdaysOfWeek(d: Date): Date[] {
  const monday = startOfWeek(d);
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

// Format za prikaz: "pon, 15.09."
export function formatDateShort(d: Date): string {
  const days = ['ned', 'pon', 'uto', 'sre', 'čet', 'pet', 'sub'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${days[d.getDay()]}, ${dd}.${mm}.`;
}

export function formatDateLong(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}.`;
}
