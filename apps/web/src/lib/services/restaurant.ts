export interface ActiveRestaurant {
  id: string;
  name: string;
  status: string;
}

export interface ActiveRestaurantContext {
  restaurant: ActiveRestaurant;
  role: string;
}

export async function getActiveRestaurant(): Promise<ActiveRestaurantContext> {
  const response = await fetch("/api/active-restaurant", {
    method: "GET",
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || !result.restaurant?.id) {
    throw new Error(
      result.error || "No hay un restaurante activo seleccionado."
    );
  }

  return result as ActiveRestaurantContext;
}

export async function getActiveRestaurantId(): Promise<string> {
  const context = await getActiveRestaurant();
  return context.restaurant.id;
}