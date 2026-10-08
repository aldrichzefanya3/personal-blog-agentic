This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:8000](http://localhost:8000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The GitHub Actions workflow deploys pushes to `development` as Vercel Preview
deployments and pushes to `production` as Vercel Production deployments. It uses
GitHub Actions Environments named `development` and `production`, respectively.

Before deploying:

1. Add the Vercel project variables to the appropriate scopes. Configure
   Preview variables for the `development` branch and Production variables for
   the `production` branch.
2. In GitHub, create the `development` and `production` environments under
   **Settings → Environments**. Add these environment secrets to both:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

Vercel's built-in Development environment is for local `vercel dev` and cannot
be used for a remote deployment. The `development` branch therefore deploys as
a Preview, using Preview-scoped variables. See the
[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
for more details.
