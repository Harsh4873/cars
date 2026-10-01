# Cars Firebase sync setup

Cars stays hosted on GitHub Pages at `https://harsh.bet/cars/`. Firebase supplies Google Authentication and Firestore only. The shared project is **pickledgerpro**; `firebase.json` contains no Hosting configuration.

## Owner setup

1. In Firebase Authentication, enable Google sign-in and authorize `harsh.bet` (and any preview domain used for sign-in).
2. Provision each approved, verified Google identity in `owner_vault_members/{uid}` with `{ vaultId: '<shared vault id>', schemaVersion: 1, status: 'active' }`. Use the same vault id as the other harsh.bet apps. Rules restrict membership reads and vault access to those identities.
3. Copy `.env.example` to `.env.local` for local development. Fill all six `VITE_FIREBASE_*` fields with the **public Web app config** from pickledgerpro. Never add Admin SDK credentials or service-account keys.
4. Add the same six values as GitHub Actions **variables** for this repo (repository or `github-pages` environment). The Pages workflow injects them at build time. Actions secrets do not conceal values embedded in a browser bundle.

A production build refuses missing or partial config. To deliberately build without Firebase locally, run:

```sh
CARS_ALLOW_LOCAL_ONLY_BUILD=1 npm run build
```

Partial config always fails. With no config, the app stays local-only and hides sign-in. A partial config in a development bundle shows a sync error.

## Data and conflict behavior

The document is `users/{vaultId}/cars/core`: `schemaVersion: 1`, `history` (`{ id, decision }[]`), ISO `updatedAt`, numeric `updatedAtMs`, `clientId`, and server `syncedAt`. The browser keeps `harsh-bet-cars-v1` as the immediate offline history and separate timestamp and stable client-id keys for sync. The whole history with the later `updatedAtMs` wins; `clientId` breaks millisecond ties. This lets Undo and Reset remove cloud decisions. A pre-sync legacy history without a timestamp has timestamp zero, so an existing cloud document wins on first connection. Device clock skew can affect this simple last-write-wins policy.

The app waits for a server snapshot before its first write and debounces changes for 600 ms. Signing out leaves local history intact. Firestore's browser cache is enabled for offline access; localStorage remains the deck's immediate fallback.

## Shared rules deployment

`firestore.rules` is the full shared pickledgerpro ruleset copied from gym, with a Cars section added. The project uses **one** ruleset: before any parent deploy, update the sibling apps' rules copies and their `shared-firestore-rules.sha256` pins to exactly this full file, then run their shared-rule checks. Cars alone must not deploy a divergent ruleset. After that coordination, deploy rules separately from the Pages build:

```sh
firebase deploy --only firestore:rules
```

This run does not deploy rules. The Cars rules allow only owner-vault members to read/write the document, validate its envelope, reject older updates, and prohibit deletes.
