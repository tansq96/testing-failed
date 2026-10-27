# Renewal Radar

A web app that tracks your subscriptions and free trials, and emails you the day before each charge and 3 days before a trial ends.

- **Free plan:** up to 5 subscriptions.
- **Pro plan:** $2.99/month, unlimited subscriptions (paid through Stripe).

Built with Next.js, Supabase (sign-in and database), Stripe (payments) and Resend (emails). It runs on Vercel.

## Going live (one time)

1. **Supabase:** create a project at supabase.com. Open **SQL Editor**, paste in everything from `supabase/schema.sql`, and click **Run**. Under **Authentication → URL Configuration**, set the Site URL to your website address.
2. **Stripe:** create a product called "Renewal Radar Pro" with a $2.99 monthly price, and copy its price id (`price_...`). Under **Developers → Webhooks**, add the endpoint `https://YOUR-SITE/api/stripe-webhook` with the `customer.subscription.*` events, then copy the signing secret.
3. **Resend:** sign up at resend.com, verify your domain, and create an API key.
4. **Vercel:** import this GitHub repository at vercel.com/new, paste every value from `.env.example` into **Environment Variables**, and click **Deploy**. The daily reminder job in `vercel.json` starts automatically.

## Running locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```
