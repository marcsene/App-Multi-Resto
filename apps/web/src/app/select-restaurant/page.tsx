
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
};

export default function SelectRestaurantPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRestaurants() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("restaurant_members")
          .select("restaurant_id, role")
          .eq("user_id", user.id)
          .eq("status", "active");

      if (membershipError) {
        setError("No fue posible consultar tus restaurantes.");
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        router.replace("/setup-restaurant");
        return;
      }

      const ids = memberships.map((item) => item.restaurant_id);

      const { data: restaurantData, error: restaurantError } =
        await supabase
          .from("restaurants")
          .select("id, name, slug, status")
          .in("id", ids);

      if (restaurantError) {
        setError("No fue posible cargar los restaurantes.");
        setLoading(false);
        return;
      }

      const available: Restaurant[] = (restaurantData ?? [])
        .filter(
          (restaurant) =>
            restaurant.status === "active" ||
            restaurant.status === "pending"
        )
        .map((restaurant) => ({
          ...restaurant,
          role:
            memberships.find(
              (item) => item.restaurant_id === restaurant.id
            )?.role ?? "",
        }));

      if (available.length === 0) {
        router.replace("/setup-restaurant");
        return;
      }

      if (available.length === 1) {
        await chooseRestaurant(available[0].id);
        return;
      }

      setRestaurants(available);
      setLoading(false);
    }

    loadRestaurants();
  }, [router]);

  async function chooseRestaurant(restaurantId: string) {
    setSelecting(true);
    setError("");

    try {
      const response = await fetch("/api/active-restaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurantId }),
      });

      if (!response.ok) {
        throw new Error("No se pudo seleccionar el restaurante.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No fue posible seleccionar el restaurante. Inténtalo nuevamente.");
      setSelecting(false);
      setLoading(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Cargando tus restaurantes...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Selecciona tu restaurante
          </h1>
          <p className="mt-2 text-slate-600">
            Elige el restaurante que deseas administrar.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              disabled={selecting}
              onClick={() => chooseRestaurant(restaurant.id)}
              className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {restaurant.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Rol: {restaurant.role}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Estado: {restaurant.status}
                  </p>
                </div>

                <span className="text-sm font-semibold text-blue-600">
                  {selecting ? "Ingresando..." : "Administrar →"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
