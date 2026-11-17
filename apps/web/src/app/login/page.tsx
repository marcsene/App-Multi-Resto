
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRestaurantDestination } from "@/lib/supabase/restaurant-access";
import { LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError("Correo electrónico o contraseña incorrectos.");
        return;
      }

      const destination = await getRestaurantDestination();

      router.replace(destination);
      router.refresh();
    } catch (err) {
      console.error("Error al iniciar sesión:", err);

      setError(
        "No fue posible completar el inicio de sesión. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white">
            M
          </div>

          <h1 className="text-2xl font-bold text-white">
            App-Multi-Resto
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Accede a tu plataforma de administración.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Correo electrónico
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <Mail size={18} className="text-slate-400" />

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Contraseña
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <LockKeyhole size={18} className="text-slate-400" />

              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contraseña"
                className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-950 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Todavía no tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold text-orange-400 hover:text-orange-300"
          >
            Crear cuenta
          </Link>
        </p>

      </section>
    </main>
  );
}
