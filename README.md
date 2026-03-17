# TaskFlow - Fullstack Task Manager

A fullstack task manager project built with:
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Authentication:** JWT
- **Database:** SQLite

## Features
- Register and log in
- JWT-based authentication
- Create, update, delete, and filter tasks
- Track task status and priority
- Search tasks by title or description
- Responsive UI

## Project structure

```bash
fullstack-task-manager/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── .env.example
│   ├── db.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── styles.css
└── README.md
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set a secure `JWT_SECRET`.

Then start the backend:

```bash
npm run dev
```

The API will run on `http://localhost:4000`.

## 2. Frontend setup

Open the `frontend` folder with **VS Code**.

You can run it with the **Live Server** extension, or any static server.

If you use Live Server, the frontend usually runs at:

```bash
http://127.0.0.1:5500/frontend/
```

If your frontend origin is different, update `CLIENT_ORIGIN` in `backend/.env`.

## API routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Tasks
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`

## CV-ready description

> Built a fullstack task management application using JavaScript, Node.js, Express, SQLite, and JWT authentication. Implemented user registration/login, REST API endpoints, CRUD operations, filtering, and a responsive frontend interface.

## Next upgrades
- Move frontend to React
- Add due-date reminders
- Add dark/light theme switch
- Deploy backend to Render or Railway
- Use PostgreSQL instead of SQLite
