# React Admin Starter

Plantilla de panel admin con **login**, **usuarios**, **roles** y **permisos**.
Companion del API `laravel-starter`.

## Stack

- React + Vite + TypeScript
- shadcn/ui
- React Router
- React Hook Form + Zod
- Axios

## Arranque

```bash
npm install
cp .env.example .env   # si existe; o define VITE_API_URL
npm run dev
```

Por defecto apunta a `/api/v1` (usa proxy de Vite o `VITE_API_URL`).

## Credenciales (seed del API)

- Email: `admin@example.com`
- Password: `password`

## Incluye

- Auth (login, perfil, avatar)
- CRUD usuarios
- Roles dinámicos + sync de permisos
- Catálogo de permisos
- Layout sidebar + dark mode

## Relacionado

Backend companion: `laravel-starter`
