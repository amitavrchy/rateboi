const couriers = ["Pathao", "Steadfast", "RedX", "Paperfly", "eCourier", "Sundarban"];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">RateBoi</p>
        <h1 className="text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
          কোন কুরিয়ারে পাঠালে খরচ সবচেয়ে কম?
        </h1>
        <p className="text-lg text-zinc-600">
          Pathao, Steadfast, RedX সহ সব কুরিয়ারের ডেলিভারি চার্জ, COD চার্জ আর রিটার্ন খরচ এক জায়গায় তুলনা করুন — তারপর এক ক্লিকে বুক করুন।
        </p>
      </header>
      <section aria-label="Couriers" className="flex flex-wrap gap-2">
        {couriers.map((c) => (
          <span key={c} className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700">
            {c}
          </span>
        ))}
      </section>
      <p className="text-sm text-zinc-500">
        Calculator, route pages and seller dashboard are built milestone by milestone — see PROJECT_SPEC.md.
      </p>
    </main>
  );
}
