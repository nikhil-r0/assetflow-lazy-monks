#!/bin/bash
set -e

echo "Starting PostgreSQL database container..."
docker compose up -d db

echo "Waiting for PostgreSQL to be ready..."
sleep 5 # Wait a few seconds for the DB to initialize

echo "Running initial Prisma migration (0000_init)..."
cd backend
npx prisma migrate dev --name init

echo "Generating Prisma client..."
npx prisma generate

echo "Database setup complete! You can view it by running 'npx prisma studio' inside the backend folder."
