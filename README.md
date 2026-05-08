# IT Project Management System

**Development of an Information System for IT Project Management** - a diploma thesis project.

A local web application for IT teams to create and manage projects, invite participants, track tasks on a Kanban board, assign roles, and monitor project progress.

## Tech Stack

- **Next.js 15** (App Router, Server Actions, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **Prisma ORM** + **SQLite**
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

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="generate-a-random-secret-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Initialize database

```bash
npm run db:generate
npm run db:push
```

### 4. Optional seed data

```bash
npm run db:seed
```

Creates demo users and a sample project with tasks.

### 5. Run the local development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prisma Studio

```bash
npm run db:studio
```

Open [http://localhost:5555](http://localhost:5555).

## Project Structure

```text
app/
  (auth)/login, register
  (dashboard)/
    dashboard/
    projects/
      page.tsx
      [id]/page.tsx
components/
  ui/
  KanbanBoard.tsx, KanbanColumn.tsx, TaskCard.tsx
  TaskForm.tsx, ProjectForm.tsx, ProjectsTable.tsx
  Sidebar.tsx, Navbar.tsx, ThemeToggle.tsx
lib/
  prisma.ts, auth.ts, utils.ts, validations.ts, rbac.ts
  actions/
prisma/
  schema.prisma
```

## Features

- **Auth**: sign up, sign in, sign out
- **Roles**: system admin, project manager, project member
- **Projects**: create, edit, delete, invite users, remove project members
- **Kanban board**: To Do, In Progress, Done
- **Tasks**: create, edit, move, delete, assign users according to RBAC rules
- **Auto-priority rule**: deadline under 3 days = HIGH, under 7 days = MEDIUM, otherwise LOW
- **Dashboard**: project and task statistics
- **Dark mode**: theme toggle in navbar

## Deployment

Deployment is not configured in the current version.
