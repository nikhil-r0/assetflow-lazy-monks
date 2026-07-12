#!/bin/bash
set -e

# Copy .env.example to .env if it doesn't exist
if [ ! -f backend/.env ]; then
  echo "Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  echo "Please check backend/.env to ensure your local postgres credentials (user, password, port) are correct."
fi

echo "Applying migrations + generating Prisma client..."
cd backend
npx prisma migrate deploy
npx prisma generate

echo "Database setup complete! View tables with: cd backend && npx prisma studio"
echo "Note: docker-compose exposes Postgres on host port 5434 — match that in backend/.env"

