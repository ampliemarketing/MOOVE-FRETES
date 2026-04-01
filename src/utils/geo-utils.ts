/**
 * Utilitários de geolocalização para cálculo de distância entre coordenadas
 */

/**
 * Calcula a distância em km entre dois pontos usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lng1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lng2 Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Mapeamento de coordenadas de cidades brasileiras (capitais + cidades principais)
 * Formato: "NomeCidade-UF" => { lat, lng }
 */
const cityCoordinatesMap: Record<string, { lat: number; lng: number }> = {
  // Capitais
  'Rio Branco-AC': { lat: -9.9754, lng: -67.8249 },
  'Maceió-AL': { lat: -9.6658, lng: -35.7353 },
  'Macapá-AP': { lat: 0.0349, lng: -51.0694 },
  'Manaus-AM': { lat: -3.119, lng: -60.0217 },
  'Salvador-BA': { lat: -12.9714, lng: -38.5124 },
  'Fortaleza-CE': { lat: -3.7172, lng: -38.5433 },
  'Brasília-DF': { lat: -15.7975, lng: -47.8919 },
  'Vitória-ES': { lat: -20.3155, lng: -40.3128 },
  'Goiânia-GO': { lat: -16.6869, lng: -49.2648 },
  'São Luís-MA': { lat: -2.5307, lng: -44.2826 },
  'Cuiabá-MT': { lat: -15.601, lng: -56.0974 },
  'Campo Grande-MS': { lat: -20.4697, lng: -54.6201 },
  'Belo Horizonte-MG': { lat: -19.9167, lng: -43.9345 },
  'Belém-PA': { lat: -1.4558, lng: -48.5024 },
  'João Pessoa-PB': { lat: -7.115, lng: -34.861 },
  'Curitiba-PR': { lat: -25.4284, lng: -49.2733 },
  'Recife-PE': { lat: -8.0476, lng: -34.877 },
  'Teresina-PI': { lat: -5.0892, lng: -42.8019 },
  'Rio de Janeiro-RJ': { lat: -22.9068, lng: -43.1729 },
  'Natal-RN': { lat: -5.7945, lng: -35.211 },
  'Porto Alegre-RS': { lat: -30.0346, lng: -51.2177 },
  'Porto Velho-RO': { lat: -8.7612, lng: -63.9004 },
  'Boa Vista-RR': { lat: 2.8195, lng: -60.6714 },
  'Florianópolis-SC': { lat: -27.5954, lng: -48.548 },
  'São Paulo-SP': { lat: -23.5505, lng: -46.6333 },
  'Aracaju-SE': { lat: -10.9091, lng: -37.0677 },
  'Palmas-TO': { lat: -10.1689, lng: -48.3317 },

  // Cidades grandes e polos logísticos
  'Campinas-SP': { lat: -22.9099, lng: -47.0626 },
  'Guarulhos-SP': { lat: -23.4538, lng: -46.5333 },
  'Santos-SP': { lat: -23.9608, lng: -46.3336 },
  'São José dos Campos-SP': { lat: -23.1791, lng: -45.8872 },
  'Sorocaba-SP': { lat: -23.5015, lng: -47.4526 },
  'Ribeirão Preto-SP': { lat: -21.1704, lng: -47.8103 },
  'São José do Rio Preto-SP': { lat: -20.8113, lng: -49.3758 },
  'Bauru-SP': { lat: -22.3246, lng: -49.0871 },
  'Piracicaba-SP': { lat: -22.7255, lng: -47.6492 },
  'Jundiaí-SP': { lat: -23.1864, lng: -46.8841 },
  'Osasco-SP': { lat: -23.5325, lng: -46.7917 },
  'Santo André-SP': { lat: -23.6737, lng: -46.5432 },
  'São Bernardo do Campo-SP': { lat: -23.6914, lng: -46.5646 },
  'Franca-SP': { lat: -20.5389, lng: -47.4013 },
  'Marília-SP': { lat: -22.2139, lng: -49.9458 },
  'Presidente Prudente-SP': { lat: -22.1256, lng: -51.3889 },
  'Niterói-RJ': { lat: -22.8833, lng: -43.1036 },
  'Duque de Caxias-RJ': { lat: -22.7856, lng: -43.3117 },
  'Petrópolis-RJ': { lat: -22.5112, lng: -43.1779 },
  'Volta Redonda-RJ': { lat: -22.5232, lng: -44.1042 },
  'Contagem-MG': { lat: -19.9321, lng: -44.0539 },
  'Uberlândia-MG': { lat: -18.9186, lng: -48.2772 },
  'Juiz de Fora-MG': { lat: -21.7642, lng: -43.3503 },
  'Uberaba-MG': { lat: -19.7472, lng: -47.9318 },
  'Montes Claros-MG': { lat: -16.7352, lng: -43.8637 },
  'Ipatinga-MG': { lat: -19.4685, lng: -42.5366 },
  'Governador Valadares-MG': { lat: -18.8509, lng: -41.9494 },
  'Londrina-PR': { lat: -23.3045, lng: -51.1696 },
  'Maringá-PR': { lat: -23.4273, lng: -51.9375 },
  'Cascavel-PR': { lat: -24.9578, lng: -53.4596 },
  'Ponta Grossa-PR': { lat: -25.0945, lng: -50.1633 },
  'Foz do Iguaçu-PR': { lat: -25.5163, lng: -54.5854 },
  'Joinville-SC': { lat: -26.3045, lng: -48.8487 },
  'Blumenau-SC': { lat: -26.9194, lng: -49.0661 },
  'Chapecó-SC': { lat: -27.1006, lng: -52.6158 },
  'Itajaí-SC': { lat: -26.9078, lng: -48.6619 },
  'Caxias do Sul-RS': { lat: -29.1681, lng: -51.1794 },
  'Pelotas-RS': { lat: -31.7654, lng: -52.3376 },
  'Santa Maria-RS': { lat: -29.6868, lng: -53.8149 },
  'Novo Hamburgo-RS': { lat: -29.6788, lng: -51.1299 },
  'Passo Fundo-RS': { lat: -28.2624, lng: -52.4068 },
  'Vila Velha-ES': { lat: -20.3297, lng: -40.2922 },
  'Serra-ES': { lat: -20.1209, lng: -40.3075 },
  'Cariacica-ES': { lat: -20.2635, lng: -40.4165 },
  'Feira de Santana-BA': { lat: -12.2669, lng: -38.9666 },
  'Vitória da Conquista-BA': { lat: -14.8619, lng: -40.8444 },
  'Camaçari-BA': { lat: -12.6996, lng: -38.3263 },
  'Ilhéus-BA': { lat: -14.7936, lng: -39.0394 },
  'Aparecida de Goiânia-GO': { lat: -16.8198, lng: -49.2469 },
  'Anápolis-GO': { lat: -16.3281, lng: -48.953 },
  'Rio Verde-GO': { lat: -17.7981, lng: -50.9292 },
  'Rondonópolis-MT': { lat: -16.4673, lng: -54.637 },
  'Sinop-MT': { lat: -11.8642, lng: -55.5066 },
  'Dourados-MS': { lat: -22.2214, lng: -54.8062 },
  'Três Lagoas-MS': { lat: -20.7849, lng: -51.7004 },
  'Imperatriz-MA': { lat: -5.5189, lng: -47.4914 },
  'Marabá-PA': { lat: -5.3685, lng: -49.1178 },
  'Santarém-PA': { lat: -2.4426, lng: -54.7083 },
  'Caruaru-PE': { lat: -8.2823, lng: -35.9761 },
  'Petrolina-PE': { lat: -9.3891, lng: -40.5027 },
  'Campina Grande-PB': { lat: -7.2307, lng: -35.8817 },
  'Mossoró-RN': { lat: -5.1878, lng: -37.3443 },
  'Sobral-CE': { lat: -3.6868, lng: -40.3483 },
  'Juazeiro do Norte-CE': { lat: -7.2131, lng: -39.3157 },
  'Arapiraca-AL': { lat: -9.7523, lng: -36.6611 },
};

/**
 * Busca coordenadas de uma cidade brasileira pelo nome e estado
 * Tenta match exato primeiro, depois fallback para capital do estado
 * @returns { lat, lng } ou null se não encontrado
 */
export function getCityCoordinates(city: string, state: string): { lat: number; lng: number } | null {
  if (!city || !state) return null;

  // Normalizar para comparação
  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const normalizedCity = normalize(city);
  const normalizedState = normalize(state);

  // 1. Tentar match exato "Cidade-UF"
  const exactKey = `${city}-${state}`;
  if (cityCoordinatesMap[exactKey]) {
    return cityCoordinatesMap[exactKey];
  }

  // 2. Tentar match normalizado
  for (const [key, coords] of Object.entries(cityCoordinatesMap)) {
    const [keyCity, keyState] = key.split('-');
    if (normalize(keyCity) === normalizedCity && normalize(keyState) === normalizedState) {
      return coords;
    }
  }

  // 3. Fallback: capital do estado
  for (const [key, coords] of Object.entries(cityCoordinatesMap)) {
    const [, keyState] = key.split('-');
    if (normalize(keyState) === normalizedState) {
      return coords; // Retorna a primeira cidade do estado (geralmente capital)
    }
  }

  return null;
}
