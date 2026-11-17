import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/services/restaurant";

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  preparation_area: string;
  is_available: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  category_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  preparation_area: string;
  sort_order?: number;
  is_available?: boolean;
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(input: ProductInput) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("El precio debe ser un número válido y no negativo.");
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      restaurant_id: restaurantId,
      category_id: input.category_id,
      name: input.name.trim(),
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      price: input.price,
      preparation_area: input.preparation_area,
      is_available: input.is_available ?? true,
      is_active: true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  if (
    input.price !== undefined &&
    (!Number.isFinite(input.price) || input.price < 0)
  ) {
    throw new Error("El precio debe ser un número válido y no negativo.");
  }

  const updates: Record<string, unknown> = {};

  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.price !== undefined) updates.price = input.price;
  if (input.preparation_area !== undefined) {
    updates.preparation_area = input.preparation_area;
  }
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.is_available !== undefined) {
    updates.is_available = input.is_available;
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

export async function setProductAvailability(
  id: string,
  isAvailable: boolean
) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;
}

export async function deactivateProduct(id: string) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;
}