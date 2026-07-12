#!/bin/bash
set -e

# Copy .env.example to .env if it doesn't exist
if [ ! -f backend/.env ]; then
  echo "Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  echo "Please check backend/.env to ensure your local postgres credentials (user, password, port) are correct."
fi

echo "Running initial Prisma migration (0000_init)..."
cd backend
npx prisma migrate dev --name init

echo "Generating Prisma client..."
npx prisma generate

echo "Database setup complete! You can view it by running 'npx prisma studio' inside the backend folder."

