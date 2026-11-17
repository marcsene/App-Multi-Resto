
import { createClient } from "@/lib/supabase/client";

export type RestaurantDestination =
  | "/setup-restaurant"
  | "/dashboard"
  | "/select-restaurant";

export async function getRestaurantDestination(): Promise<RestaurantDestination> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No existe una sesión autenticada.");
  }

  const { data: memberships, error } = await supabase
    .from("restaurant_members")
    .select(`
      restaurant_id,
      role,
      restaurants!inner (
        id,
        name,
        slug,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    throw new Error("No fue posible consultar tus restaurantes.");
  }

  const restaurants = memberships ?? [];

  if (restaurants.length === 0) {
    return "/setup-restaurant";
  }

  if (restaurants.length === 1) {
    return "/dashboard";
  }

  return "/select-restaurant";
}
