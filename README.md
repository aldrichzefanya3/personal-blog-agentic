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

## Scheduled AI Writer

The optional AI Writer runs daily at **08:00 Asia/Jakarta** using the GitHub
Actions schedule in `.github/workflows/ai-writer.yml`. It calls the protected
`/api/ai-writer/run` endpoint on the production site. Gemini is the initial
provider and is isolated behind `src/lib/ai-writer/gemini.ts`.

Admins can create or assign multiple `AI_WRITER` accounts from User
Management. Each account has a **Run daily** switch; new AI Writer accounts
start paused. Every enabled account generates one post per daily run. Generated
posts are marked as AI-written and remain drafts until approved using the
Telegram button. The category setting **AI auto-publish** can be enabled in
the admin Categories page to publish posts in that category immediately. The
AI Writer role has no interactive admin permissions.

To test immediately, an admin can use **Generate test draft** on an AI Writer's
row in User Management. This one-off action does not require **Run daily** to
be enabled and always saves a draft, even when its category uses auto-publish.
It still consumes the next available topic and sends the usual Telegram
approval notification.

### Setup

1. Since you already applied the AI Writer automation migration, apply
   `supabase/migrations/20261008082344_ai_writer_account_controls.sql` in the
   Supabase SQL Editor before deploying this update. It adds the per-account
   run switch. The earlier migration adds the `AI_WRITER` role, topic calendar,
   category auto-publish setting, and AI review metadata.
2. In the admin **User Management** page, create a user with role `AI_WRITER`,
   or change an existing non-admin account's role to `AI_WRITER`. New AI Writer
   accounts start paused. Switch on **Run daily** for each agent that should
   generate one post per day. No `AI_WRITER_USER_ID`, email, or separate
   account-creation script is needed.
3. Add these **server-side** variables to the Vercel Production environment:
   `GEMINI_API_KEY`, `AI_WRITER_CRON_SECRET`,
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALLOWED_USER_ID`, and
   `TELEGRAM_WEBHOOK_SECRET`. Optionally set `GEMINI_MODEL`; it defaults to
   `gemini-2.5-flash`. Keep the cron and webhook secrets separate.
4. Add `AI_WRITER_CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` as secrets in the
   GitHub Actions **production** environment. Use the same cron secret value as
   in Vercel. Set `production` as the repository's default branch so the
   scheduled workflow runs from the deployed code.
5. In Telegram, create a bot with BotFather, start a private chat with it, and
   obtain the bot token, chat ID, and your numeric Telegram user ID. Set the
   Vercel variables from step 3. Generate a `TELEGRAM_WEBHOOK_SECRET` and
   register the Vercel endpoint as the bot webhook with Telegram's
   `setWebhook` API, sending the secret as `secret_token`. Telegram requests
   are checked against that secret, the configured chat, and your user ID.

   After setting those values in your local shell, register the webhook with:

   ```sh
   curl --fail-with-body --request POST \
     "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     --data-urlencode "url=${NEXT_PUBLIC_SITE_URL%/}/api/telegram/webhook" \
     --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
     --data-urlencode 'allowed_updates=["callback_query"]'
   ```

6. Add or adjust topics in `public.ai_writer_topics`. Each topic needs a
   category ID. For example:

   ```sql
   INSERT INTO public.ai_writer_topics (topic, category_id, sort_order)
   SELECT 'How web browsers find and display a website', id, 90
   FROM public.categories
   WHERE slug = 'technology'
   ON CONFLICT (topic) DO NOTHING;
   ```

7. In the admin Categories page, leave **AI auto-publish** off to require
   Telegram approval, or turn it on for categories that may publish
   automatically. Run the workflow once with **Actions → Generate AI Writer
   post → Run workflow** to test it.

The workflow's `0 1 * * *` cron runs at 08:00 in Jakarta (UTC+7). Each enabled
AI Writer generates one post during that daily run. The provider retries up to
three times, validates the JSON and article length, sanitizes the content, and
leaves a failed topic available for a later retry. Invalid or duplicate content
is logged and is not inserted. Telegram notifications that fail are retried on
the next scheduled run.
