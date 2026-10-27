import Link from "next/link";
import { addSubscription, removeSubscription, signOut } from "./actions";
import { FREE_LIMIT, daysUntil, isoDate, money, perMonth, todayUTC, when, type Subscription } from "@/lib/billing";
import { supabaseServer } from "@/lib/supabase/server";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "MYR", "INR", "PHP", "IDR", "JPY"];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Landing />;

  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    supabase.from("subscriptions").select("*").order("next_charge"),
  ]);
  const subs = (data ?? []) as Subscription[];
  const pro = profile?.plan === "pro";

  // Totals are grouped by currency so mixed currencies are never added together.
  const totals = new Map<string, number>();
  for (const s of subs) totals.set(s.currency, (totals.get(s.currency) ?? 0) + perMonth(s));
  const [mainCurrency, mainTotal] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["USD", 0];
  const soon = subs.filter((s) => daysUntil(s.next_charge) <= 7);
  const defaultDate = isoDate(new Date(todayUTC().getTime() + 30 * 86_400_000));

  return (
    <>
      <header className="top">
        <h1>Renewal Radar</h1>
        <form action={signOut}><button className="link" type="submit">Sign out</button></form>
      </header>

      {params.upgraded && <div className="banner">Thanks! You&apos;re on Pro now, with unlimited subscriptions.</div>}
      {!pro && (
        <div className="banner">
          <span>Free plan: {subs.length} of {FREE_LIMIT} subscriptions used.</span>
          <form action="/api/checkout" method="post"><button className="btn" type="submit">Go Pro · $2.99/mo</button></form>
        </div>
      )}

      <div className="summary">
        <div><b>{money(mainTotal, mainCurrency)}</b><span>per month</span></div>
        <div><b>{money(Math.round(mainTotal * 12), mainCurrency)}</b><span>per year</span></div>
      </div>
      {totals.size > 1 && (
        <p className="note">
          Also: {[...totals.entries()].filter(([c]) => c !== mainCurrency).map(([c, t]) => `${money(t, c)}/mo`).join(", ")}
        </p>
      )}

      <section>
        <h2>Charging in the next 7 days</h2>
        <List subs={soon} empty="Nothing charging this week." />
      </section>

      <section>
        <h2>All subscriptions</h2>
        <List subs={subs} empty="Add your first subscription below." />
      </section>

      <section>
        <h2>Add a subscription</h2>
        {params.limit && <div className="banner">You&apos;ve reached the free limit of {FREE_LIMIT}. Go Pro to add more.</div>}
        <form className="card" action={addSubscription}>
          <label>Name<input id="name" name="name" required maxLength={80} placeholder="e.g. Spotify" /></label>
          <label className="half">Price<input id="price" name="price" type="number" step="0.01" min="0" required placeholder="9.99" /></label>
          <label className="half">Currency
            <select id="currency" name="currency" defaultValue="USD">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="half">Billed
            <select id="cycle" name="cycle" defaultValue="month">
              <option value="month">Monthly</option><option value="year">Yearly</option><option value="week">Weekly</option>
            </select>
          </label>
          <label className="half">Next charge date<input id="next_charge" name="next_charge" type="date" required defaultValue={defaultDate} /></label>
          <label className="check"><input id="is_trial" name="is_trial" type="checkbox" /> This is a free trial</label>
          <button className="btn" type="submit">Add subscription</button>
        </form>
        <p className="note">We email you the day before each charge, and 3 days before a free trial ends.</p>
      </section>
    </>
  );
}

function List({ subs, empty }: { subs: Subscription[]; empty: string }) {
  if (!subs.length) return <div className="list"><div className="empty">{empty}</div></div>;
  return (
    <div className="list">
      {subs.map((s) => (
        <div className="row" key={s.id}>
          <div className="name">{s.name}{s.is_trial && <span className="pill">Free trial</span>}</div>
          <div className="price">{money(Number(s.price), s.currency)} / {s.cycle}</div>
          <div className="meta">{s.is_trial ? "Trial ends " : "Charges "}{when(daysUntil(s.next_charge))}</div>
          <form action={removeSubscription}>
            <input type="hidden" name="id" value={s.id} />
            <button className="link" type="submit" aria-label={`Remove ${s.name}`}>Remove</button>
          </form>
        </div>
      ))}
    </div>
  );
}

function Landing() {
  return (
    <>
      <div className="hero">
        <h1>Never pay for a subscription you forgot about.</h1>
        <p>Renewal Radar emails you the day before every charge, and 3 days before a free trial turns into a paid plan. That gives you time to cancel.</p>
        <Link className="btn" href="/login">Start free</Link>
      </div>
      <ul className="points">
        <li><b>Free:</b> track up to {FREE_LIMIT} subscriptions with email reminders.</li>
        <li><b>Pro, $2.99/month:</b> unlimited subscriptions.</li>
        <li>Works in any currency. No bank login needed.</li>
      </ul>
    </>
  );
}
