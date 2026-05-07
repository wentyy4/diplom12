# IT Project Management System

**Development of an Information System for IT Project Management** — A diploma thesis project.

A web-based tool for IT teams to create and manage projects, track tasks on a Kanban board, assign roles, and monitor progress with rule-based priority recommendations.

## Tech Stack

- **Next.js 15** (App Router, Server Actions, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui** (Button, Card, Dialog, Badge, Select, Input, Table, Tabs, etc.)
- **Prisma ORM** + **SQLite** (default) or **PostgreSQL** (configurable)
- **NextAuth.js v5** (credentials provider, bcrypt)
- **dnd-kit** (drag-and-drop Kanban)
- **lucide-react** (icons)
- **next-themes** (dark mode)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`: For SQLite (default): `file:./dev.db`
- For PostgreSQL: `postgresql://user:password@localhost:5432/it_projects`
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: `http://localhost:3000` (for local dev)

### 3. Initialize database

```bash
npx prisma generate
npx prisma db push
```

For PostgreSQL with migrations:

```bash
npx prisma migrate dev
```

### 4. (Optional) Seed initial data

```bash
npm run db:seed
```

Creates users: `admin@example.com` (admin123), `manager@example.com` (manager123), `member@example.com` (member123), and a sample project with tasks.

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
├── (auth)/login, register
├── (dashboard)/
│   ├── dashboard/        # Overview, stats, recent tasks
│   └── projects/
│       ├── page.tsx      # Project list
│       └── [id]/page.tsx # Kanban board
components/
├── ui/                   # shadcn components
├── KanbanBoard.tsx, KanbanColumn.tsx, TaskCard.tsx
├── TaskForm.tsx, ProjectForm.tsx, ProjectsTable.tsx
├── Sidebar.tsx, Navbar.tsx, ThemeToggle.tsx
lib/
├── prisma.ts, auth.ts, utils.ts, validations.ts
├── actions/              # Server Actions (auth, projects, tasks)
prisma/
└── schema.prisma
```

## Features

- **Auth**: Sign up / Sign in / Sign out (NextAuth credentials)
- **Roles**: Admin (full access), Manager (projects + tasks), Member (own tasks)
- **Dashboard**: Stats (projects, tasks, in progress, overdue), Kanban preview, project list
- **Projects**: Create, edit, delete (Admin/Manager), member selection
- **Kanban board**: To Do | In Progress | Done, drag-and-drop (dnd-kit), add/edit/delete tasks
- **Auto-priority rule**: deadline &lt; 3 days → HIGH, &lt; 7 days → MEDIUM, else LOW
- **Dark mode**: Theme toggle in navbar (next-themes)

## Shadcn/ui Components

If you need to add more components:

```bash
npx shadcn@latest add <component-name>
```

## Deployment

- Use `npm run build` and `npm run start` for production.
- Set `DATABASE_URL` and `NEXTAUTH_SECRET` in your deployment environment.
- For Vercel, ensure PostgreSQL is configured if not using SQLite.
