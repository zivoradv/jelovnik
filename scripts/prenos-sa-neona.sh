#!/usr/bin/env bash
# Kopira celu bazu (šemu i podatke) sa Neona u Postgres iz docker-compose.yml.
# Treba samo Docker – pg_dump i pg_restore se pokreću u kontejneru. Neon se samo čita.
#
#   NEON_DATABASE_URL u .env (ili u okruženju), pa:
#   bash scripts/prenos-sa-neona.sh
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

NEON="${NEON_DATABASE_URL:-}"
if [ -z "$NEON" ] && [ -f .env ]; then
    NEON="$(sed -n 's/^NEON_DATABASE_URL=//p' .env | tail -n 1 | tr -d "\r\"'")"
fi
if [ -z "$NEON" ]; then
    echo "Nedostaje NEON_DATABASE_URL (u .env)."
    exit 1
fi
# pg_dump traži direktnu konekciju, ne pooler
NEON="${NEON/-pooler./.}"

# URL ide kroz stdin (prvi red), a ostatak stdin-a je SQL
neon() {
    { printf '%s\n' "$NEON"; cat; } | docker compose exec -T db sh -c "IFS= read -r URL; $1"
}
neon_sql() {
    neon 'psql -X -v ON_ERROR_STOP=1 -At "$URL"'
}
target() {
    docker compose exec -T db sh -c "$1"
}
target_sql() {
    target 'psql -X -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

# tačan broj redova po tabeli, isti upit za obe baze
COUNTS=$(cat <<'SQL'
select table_schema || '.' || table_name || ' ' ||
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
order by (table_schema || '.' || table_name) collate "C";
SQL
)

echo "1/5 Pokrećem bazu..."
docker compose up -d --wait db

EXISTING="$(echo "select count(*) from information_schema.tables where table_schema in ('public', 'drizzle');" | target_sql)"
if [ "$EXISTING" != "0" ]; then
    echo "Nova baza nije prazna ($EXISTING tabela) – prekidam da ništa ne pregazim."
    echo "Ako je to neuspela proba i sme da se obriše: docker compose down -v (BRIŠE novu bazu), pa ponovo."
    exit 1
fi

mkdir -p backups
DUMP="backups/neon-$(date +%Y%m%d-%H%M%S).dump"
echo "2/5 Skidam podatke sa Neona u $DUMP..."
if ! neon 'pg_dump --format=custom --no-owner --no-acl --schema=public --schema=drizzle "$URL"' </dev/null >"$DUMP"; then
    rm -f "$DUMP"
    echo "Skidanje sa Neona nije uspelo (vidi grešku iznad)."
    exit 1
fi

echo "3/5 Ubacujem u novu bazu..."
target 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error' <"$DUMP"

echo "4/5 Poredim broj redova..."
OLD="$(echo "$COUNTS" | neon_sql)"
NEW="$(echo "$COUNTS" | target_sql)"
echo "$NEW"
if [ -z "$NEW" ] || [ "$OLD" != "$NEW" ]; then
    echo "GREŠKA: broj redova se ne poklapa. Na Neonu je:"
    echo "$OLD"
    echo "Da li je stara aplikacija ugašena tokom prenosa?"
    exit 1
fi

echo "5/5 Osvežavam statistiku..."
echo "analyze;" | target_sql >/dev/null
echo "Gotovo – broj redova se poklapa u svim tabelama. Rezervna kopija: $DUMP"
