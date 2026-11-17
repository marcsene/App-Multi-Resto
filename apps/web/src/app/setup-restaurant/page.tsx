
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Store,
  MapPin,
  Coins,
  Clock,
} from "lucide-react";

export default function SetupRestaurantPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [country, setCountry] = useState("CL");
  const [currency, setCurrency] = useState("CLP");
  const [timezone, setTimezone] = useState("America/Santiago");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    const generatedSlug = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    setSlug(generatedSlug);
  }

  async function handleCreateRestaurant(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !slug.trim()) {
      setError("Completa el nombre y el identificador.");
      return;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setError("El identificador solo admite letras min├║sculas, n├║meros y guiones.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Confirmar que existe una sesi├│n autenticada.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      // Crear restaurante, asignar administrador
      // y activar la prueba gratuita mediante una sola funci├│n.
      const { data, error: createError } = await supabase.rpc(
        "create_restaurant_with_admin",
        {
          p_name: name.trim(),
          p_slug: slug.trim(),
          p_country: country,
          p_currency: currency,
          p_timezone: timezone,
        }
      );

      if (createError) {
        if (createError.code === "23505") {
          setError("Este identificador ya est├í utilizado. Prueba con otro.");
        } else {
          setError(createError.message);
        }

        return;
      }

      if (!data) {
        setError("No se recibi├│ la confirmaci├│n del restaurante.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No fue posible conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Store size={28} />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Configura tu restaurante
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Completa los datos iniciales para comenzar a utilizar App-Multi-Resto.
          </p>
        </div>

        <div className="mb-7 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="font-semibold text-orange-400">
            ┬í7 d├¡as de prueba gratuita!
          </p>

          <p className="mt-1 text-sm text-slate-300">
            Tu per├¡odo de prueba se activar├í autom├íticamente al crear tu restaurante.
          </p>
        </div>

        <form onSubmit={handleCreateRestaurant} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Nombre del restaurante
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <Store size={18} className="text-slate-400" />

              <input
                type="text"
                required
                maxLength={150}
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Ejemplo: Mi Restaurante"
                className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Identificador del restaurante
            </label>

            <input
              type="text"
              required
              maxLength={80}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="mi-restaurante"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Se utilizar├í para identificar tu restaurante dentro de la plataforma.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Pa├¡s
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <MapPin size={18} className="text-slate-400" />

              <select
                value={country}
                onChange={(event) => {
                  const value = event.target.value;

                  setCountry(value);

                  if (value === "CL") {
                    setCurrency("CLP");
                    setTimezone("America/Santiago");
                  } else if (value === "US") {
                    setCurrency("USD");
                    setTimezone("America/New_York");
                  } else if (value === "FR") {
                    setCurrency("EUR");
                    setTimezone("Europe/Paris");
                  } else if (value === "ES") {
                    setCurrency("EUR");
                    setTimezone("Europe/Madrid");
                  } else if (value === "BR") {
                    setCurrency("BRL");
                    setTimezone("America/Sao_Paulo");
                  }
                }}
                className="w-full bg-transparent py-3 text-white outline-none"
              >
                <option value="CL">Chile</option>
                <option value="US">Estados Unidos</option>
                <option value="FR">Francia</option>
                <option value="ES">Espa├▒a</option>
                <option value="BR">Brasil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Moneda
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <Coins size={18} className="text-slate-400" />

              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full bg-transparent py-3 text-white outline-none"
              >
                <option value="CLP">CLP - Peso chileno</option>
                <option value="USD">USD - D├│lar estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="BRL">BRL - Real brasile├▒o</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Zona horaria
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4">
              <Clock size={18} className="text-slate-400" />

              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full bg-transparent py-3 text-white outline-none"
              >
                <option value="America/Santiago">Santiago</option>
                <option value="America/New_York">Nueva York</option>
                <option value="Europe/Paris">Par├¡s</option>
                <option value="Europe/Madrid">Madrid</option>
                <option value="America/Sao_Paulo">S├úo Paulo</option>
              </select>
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
            {loading ? "Creando restaurante..." : "Crear mi restaurante"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Al continuar, se crear├í tu restaurante y quedar├ís registrado como su administrador.
        </p>
      </section>
    </main>
  );
}
