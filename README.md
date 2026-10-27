# DoorChat

A simple chat application built with NestJS, React,
Socket.IO, and PostgreSQL.

## Requirements
- Node.js 24 LTS
- Docker Desktop

## Quick Start

1. Clone the repository.
2. Run `npm install` in the project root.
3. Create `apps/api/.env` with the following variables:

   DATABASE_URL=postgresql://chat_app:local_only_password@127.0.0.1:5432/chat_dev
   SESSION_SECRET=your_random_secret

4. Run `docker compose up -d db` to start the PostgreSQL database container.
5. Run `npm run db:migrate --workspace chat-api` to create the database tables.
6. Start the applications in separate terminals:
   - Backend: `npm run api`
   - Frontend: `npm run web`

7. Open http://localhost:5173 in your browser.