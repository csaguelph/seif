# Component structure

- **`ui/`** – Generic, reusable UI primitives (icons, buttons, inputs, etc.). No app/route logic.
- **`layout/`** – Page structure: navbar, footer, sidebars, wrappers. Composes `ui` and `auth` as needed.
- **`auth/`** – Auth-related components (sign-in link, user dropdown, role badges). Use for anything that depends on session or auth state.

Add new components in the folder that matches their role. Prefer importing from these paths (e.g. `~/components/layout/navbar`) so the structure stays clear.
