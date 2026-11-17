import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/services/restaurant";

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function createCategory(input: CategoryInput) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name: input.name.trim(),
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deactivateCategory(id: string) {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;
}