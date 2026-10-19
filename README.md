# Commons

A public community board for asks, offers, and projects. Members can share work, find relevant posts, send private introductions, and celebrate outcomes. Visitors can read public posts without an account; participating requires email admission.

Commons is a self-hosted Next.js application with Supabase Auth, PostgreSQL, and Storage. Its local preview uses fictional content and needs no provider account.

## Try it locally

Install Node.js **22.13 or newer** and npm. From the directory containing `package.json`:

```sh
npm ci
npm run preview
```

Open [http://127.0.0.1:3100](http://127.0.0.1:3100). Choose a fictional member to explore the board. Stop with Ctrl+C. Preview is a demonstration, not persistent community storage or a production authentication mode. Do not run preview and a production build at the same time; both use `.next`.

## Run your community

Follow [the installation guide](docs/INSTALL.md) for a fresh Supabase project, sign-in email, admission, and a Node deployment. Configure your identity in [`src/config/community.ts`](src/config/community.ts), provide your own domain and contact address, and review the public privacy and terms pages before inviting members.

- [October 2026 controls, previews and sign-in update](docs/updates/2026-10-controls-previews-and-sign-in.md)
- [October 2026 browsing and help update](docs/updates/2026-10-browsing-and-help.md)
- [Public release checklist](docs/release-checklist.md)
- [Configuration and customization](docs/configuration.md)
- [Integrations and data flows](docs/integrations.md)
- [Search and discovery](docs/discovery.md)
- [Operations, privacy, backups, and upgrades](docs/operations.md)
- [Optional Cloudflare deployment](docs/deployment-cloudflare.md)
- [Contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md)

## Included

Public asks, offers, projects and outcomes; topic and type filters; local full-text search; an RSS feed of public posts; member profiles; 48 local illustrated avatars; public photos and PDF/image attachments; independent reactions; a public FAQ; collaborator credits and mentions; private introductions; optional notification emails; and background file cleanup. Supabase row-level security restricts private records and writes. Public uploads are not a place for confidential material.

## Verification and release limits

The guides describe the shipped source and installed CLI interfaces. A local build does not prove a fresh hosted installation, SMTP delivery, deployed privacy controls, or scheduled cleanup. Complete the installation acceptance checklist on your own staging deployment before admitting real members. Cloudflare uses vinext and beta adapter tooling; treat that route as an additional deployment validation task.

Public redistribution of the user-supplied reaction artwork and bundled decorative artwork remains subject to verification of its rights. Private export was authorized; that does not independently establish a public redistribution license. See [third-party notices](THIRD_PARTY_NOTICES.md) before publishing a fork or release containing those assets.

## License and cost

Commons code is [MIT licensed](LICENSE), copyright 2026 BigLeverVentures. If you use Commons, please consider keeping “Built on Commons by Big Lever Ventures” in your footer as a courtesy. This is optional and is not a condition of the MIT license. Third-party assets and dependencies retain their own notices. Hosting, email, storage, domains, and other provider services may charge fees; the software license does not include those services.
