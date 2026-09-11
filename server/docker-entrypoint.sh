#!/bin/sh
set -e

echo "applying database migrations"
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "seeding demo data"
  node dist/prisma/seed.js
fi

exec "$@"
