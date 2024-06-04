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
- Node ^21
- pnpm
- Docker & Docker Compose

Install dependencies with pnpm:
```bash
# Install dependencies
pnpm i
```

Start the app, including running the containers required for the backend.

```bash
# Run the app
pnpm start
```

# Deploying 

Deployment is already set up if you're using fly.io. You need to edit the `fly.main.toml`and `fly.og.toml` to enter your own project credentials and domain. Then, you can deploy the app using the following commands:

```sh
# Deploy the main app
pnpm deploy:main

# Deploy the OG image generator
pnpm deploy:og
```
