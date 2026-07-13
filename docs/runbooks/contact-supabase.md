# Contact form → Supabase

The `/contact` page inserts one row per message into a Supabase table using a
plain PostgREST call (`src/lib/contact.ts`) — no SDK. It authenticates with the
**publishable key** (`sb_publishable_…`); the app **rejects legacy anon JWT
keys** by design, and secret/service_role keys must never appear client-side.
Security comes from row-level security: the public role can INSERT and nothing
else.

## 1. Create the table + RLS (SQL editor)

```sql
create table public.contact_messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) <= 200),
  email      text not null check (char_length(email) <= 320),
  topic      text not null check (char_length(topic) <= 60),
  message    text not null check (char_length(message) <= 4000),
  page       text check (char_length(page) <= 200)
);

alter table public.contact_messages enable row level security;

-- Public may submit a message…
create policy "public can insert contact messages"
  on public.contact_messages for insert
  to anon
  with check (true);

-- …and nothing else: no select/update/delete policies for anon.
```

Read the messages in the Dashboard (Table Editor) or from any authenticated
admin context.

## 2. Configure the keys

Dashboard → **Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **API Keys → Publishable key** (`sb_publishable_…`) → `VITE_SUPABASE_PUBLISHABLE_KEY`

Set them:

- **Local dev:** copy `.env.example` → `.env`, fill both in.
- **Production (GitHub Actions):** repo → Settings → Secrets and variables →
  Actions → add both as repository secrets. The deploy workflow forwards them
  into the Vite build. Without them the page still renders, with submissions
  disabled and an explanatory note.

## 3. Notes

- Vite inlines the values at **build time** — after adding the secrets, re-run
  the deploy workflow.
- The form has a honeypot field; obviously-bot submissions are accepted-and-
  dropped client-side without touching the table.
- Do not rotate to a legacy anon key: the client checks for the
  `sb_publishable_` prefix and disables the form otherwise.
