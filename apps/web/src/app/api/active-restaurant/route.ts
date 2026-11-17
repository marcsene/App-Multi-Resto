
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurantId = body.restaurantId;

    if (
      typeof restaurantId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        restaurantId
      )
    ) {
      return NextResponse.json(
        { error: "Identificador de restaurante inválido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "No tienes acceso a este restaurante." },
        { status: 403 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, status")
      .eq("id", restaurantId)
      .maybeSingle();

    if (
      restaurantError ||
      !restaurant ||
      !["active", "pending"].includes(restaurant.status)
    ) {
      return NextResponse.json(
        { error: "Este restaurante no está disponible." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("active_restaurant_id", restaurantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Error al seleccionar restaurante:", error);

    return NextResponse.json(
      { error: "No fue posible procesar la selección." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "No existe una sesión autenticada." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const restaurantId = cookieStore.get("active_restaurant_id")?.value;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "No hay un restaurante seleccionado." },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { error: "No fue posible verificar los permisos." },
        { status: 503 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso a este restaurante." },
        { status: 403 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, status")
      .eq("id", restaurantId)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "El restaurante no está disponible." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      restaurant,
      role: membership.role,
    });
  } catch (error) {
    console.error("Error obteniendo restaurante activo:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
