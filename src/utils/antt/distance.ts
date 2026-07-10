/**
 * Estimativa de distância rodoviária origem → destino via Mapbox
 * (Geocoding + Directions API), usada para calcular o piso mínimo ANTT
 * (Piso = distância_km × CCD + CC) no momento da publicação do frete.
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface LngLat {
  lng: number;
  lat: number;
}

async function geocodeCity(city: string, state: string): Promise<LngLat | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const query = encodeURIComponent(`${city}, ${state}, Brasil`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=BR&types=place&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature?.center) return null;
    const [lng, lat] = feature.center;
    return { lng, lat };
  } catch (error) {
    console.error('❌ Erro ao geocodificar cidade:', error);
    return null;
  }
}

async function drivingDistanceKm(origin: LngLat, destination: LngLat): Promise<number | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== 'number') return null;
    return Math.round((meters / 1000) * 10) / 10;
  } catch (error) {
    console.error('❌ Erro ao calcular distância de rota:', error);
    return null;
  }
}

/**
 * Retorna a distância rodoviária estimada (km) entre duas cidades brasileiras.
 * Retorna `null` se o token do Mapbox não estiver configurado ou se a rota
 * não puder ser calculada — quem chamar deve tratar isso como "distância
 * desconhecida", nunca assumir 0 km.
 */
export async function estimateRouteDistanceKm(
  originCity: string,
  originState: string,
  destinationCity: string,
  destinationState: string
): Promise<number | null> {
  if (!originCity || !originState || !destinationCity || !destinationState) return null;

  const [origin, destination] = await Promise.all([
    geocodeCity(originCity, originState),
    geocodeCity(destinationCity, destinationState),
  ]);

  if (!origin || !destination) return null;

  return drivingDistanceKm(origin, destination);
}
