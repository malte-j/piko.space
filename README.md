<a href="https://piko.space">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/12611076/233309873-564be625-fb87-408e-8762-e3ae15098e5a.png">
    <img alt="piko.space logo with the caption: Collaborate at the speed of light and seamlessly sync offline work" src="https://user-images.githubusercontent.com/12611076/233309946-78fc7c82-4b45-4728-bf0e-7151512a10c8.png">
  </picture>
</a>

![Video of a user editing a file in piko.space](https://user-images.githubusercontent.com/12611076/200086646-59b967c7-85c1-4dde-a01f-73605a5e6be3.gif)

Built on [Yjs](https://github.com/yjs/yjs) and [TipTap](https://github.com/ueberdosis/tiptap)

# Setup

Requirements:
- Node 24
- pnpm
- Docker & Docker Compose

Install dependencies with pnpm:
```bash
# Install dependencies
pnpm i
```

Start the Cloudflare Workers application with local Durable Object and D1 storage:

```bash
# Run the app
pnpm start
```

The previous Fly.io/Redis stack remains available during migration with `pnpm start:legacy`. See `apps/cloudflare/README.md` for D1 provisioning, deployment, and the one-shot Redis migration procedure.

# Deploying 

The new application deploys to Cloudflare Workers after its D1 database ID has been configured:

```sh
pnpm deploy:cloudflare
```

The legacy Fly.io configuration is retained for the seven-day rollback window:

```sh
# Deploy the main app
pnpm deploy:main

# Deploy the OG image generator
pnpm deploy:og
```
