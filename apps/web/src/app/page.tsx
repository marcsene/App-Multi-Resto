
import Link from "next/link";
import {
  UtensilsCrossed,
  ArrowRight,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <UtensilsCrossed size={25} />
          </span>
          <strong className="text-xl">App-Multi-Resto</strong>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-slate-300"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            <ShieldCheck size={16} />
            Una plataforma para tu restaurante
          </span>

          <h1 className="mt-8 text-5xl font-bold leading-tight md:text-6xl">
            Administra tu restaurante desde un solo lugar.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Organiza tus operaciones, gestiona tus pedidos y coordina tu equipo
            con App-Multi-Resto.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-4 font-semibold"
            >
              Comenzar ahora <ArrowRight size={19} />
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-7 py-4 font-semibold"
            >
              Ya tengo una cuenta
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              title: "Pedidos",
              description: "Organiza los pedidos.",
              icon: ClipboardList,
            },
            {
              title: "Operaciones",
              description: "Coordina cocina y bar.",
              icon: ChefHat,
            },
            {
              title: "Administración",
              description: "Gestiona tu negocio.",
              icon: LayoutDashboard,
            },
            {
              title: "Restaurantes",
              description: "Administra tus establecimientos.",
              icon: UtensilsCrossed,
            },
          ].map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-7"
            >
              <Icon size={35} className="text-blue-400" />
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-7 text-center text-sm text-slate-500">
        © 2026 App-Multi-Resto. Gestión inteligente para restaurantes.
      </footer>
    </main>
  );
}
