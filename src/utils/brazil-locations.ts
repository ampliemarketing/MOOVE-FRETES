// Estados brasileiros
export const brazilianStates = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

// Cidades principais por estado (principais capitais e cidades importantes)
export const brazilianCitiesByState: Record<string, string[]> = {
  'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá'],
  'AL': ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo'],
  'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque'],
  'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas', 'Alagoinhas', 'Barreiras', 'Paulo Afonso', 'Eunápolis', 'Porto Seguro'],
  'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá'],
  'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina', 'Águas Claras', 'Gama'],
  'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz'],
  'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama', 'Catalão', 'Itumbiara', 'Senador Canedo', 'Jataí'],
  'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas'],
  'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Barra do Garças', 'Primavera do Leste'],
  'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Aquidauana', 'Nova Andradina', 'Paranaíba', 'Sidrolândia', 'Naviraí'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Santa Luzia', 'Sete Lagoas', 'Divinópolis', 'Ibirité', 'Poços de Caldas', 'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni', 'Barbacena', 'Sabará', 'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos'],
  'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Itaituba', 'Cametá', 'Bragança', 'Abaetetuba', 'Marituba', 'Altamira'],
  'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras', 'Guarabira', 'Cabedelo', 'Mamanguape'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo', 'Almirante Tamandaré', 'Umuarama', 'Paranavaí', 'Piraquara', 'Cambé'],
  'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão', 'Igarassu', 'São Lourenço da Mata', 'Abreu e Lima', 'Santa Cruz do Capibaribe', 'Ipojuca'],
  'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras', 'Altos', 'Pedro II', 'São Raimundo Nonato'],
  'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'Campos dos Goytacazes', 'São João de Meriti', 'Petrópolis', 'Volta Redonda', 'Magé', 'Macaé', 'Itaboraí', 'Cabo Frio', 'Nova Friburgo', 'Barra Mansa', 'Angra dos Reis', 'Mesquita', 'Teresópolis', 'Nilópolis'],
  'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim', 'Caicó', 'Assu', 'Currais Novos', 'Pau dos Ferros'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Uruguaiana', 'Santa Cruz do Sul', 'Cachoeirinha', 'Bagé', 'Bento Gonçalves', 'Erechim', 'Guaíba'],
  'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Cacoal', 'Vilhena', 'Jaru', 'Rolim de Moura', 'Guajará-Mirim', 'Pimenta Bueno', 'Ouro Preto do Oeste'],
  'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Mucajaí', 'Alto Alegre'],
  'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí', 'Jaraguá do Sul', 'Lages', 'Palhoça', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador', 'Camboriú', 'Navegantes', 'Concórdia', 'Rio do Sul', 'Araranguá'],
  'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Santos', 'Mauá', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Carapicuíba', 'Piracicaba', 'Bauru', 'Jundiaí', 'Franca', 'São Vicente', 'Itaquaquecetuba', 'Guarujá', 'Taubaté', 'Praia Grande', 'Limeira', 'Suzano', 'Taboão da Serra', 'Sumaré', 'Barueri', 'Embu das Artes', 'São Carlos', 'Marília', 'Indaiatuba', 'Cotia', 'Americana', 'Jacareí', 'Araraquara', 'Presidente Prudente', 'São Caetano do Sul', 'Hortolândia', 'Itapevi', 'Mogi Guaçu', 'Araçatuba', 'Itu', 'Santana de Parnaíba', 'Ferraz de Vasconcelos', 'Francisco Morato', 'Itapecerica da Serra', 'Rio Claro'],
  'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'São Cristóvão', 'Propriá', 'Tobias Barreto', 'Simão Dias', 'Barra dos Coqueiros'],
  'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins', 'Guaraí', 'Miracema do Tocantins', 'Araguatins', 'Dianópolis']
};

// Função para obter as cidades de um estado em ordem alfabética
export function getCitiesByState(stateCode: string): string[] {
  const cities = brazilianCitiesByState[stateCode] || [];
  return cities.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Função para verificar se uma cidade existe em um estado
export function isCityInState(city: string, stateCode: string): boolean {
  const cities = getCitiesByState(stateCode);
  return cities.some(c => c.toLowerCase() === city.toLowerCase());
}

// Função para obter todas as cidades do Brasil com seus estados
export interface CityWithState {
  city: string;
  state: string;
  stateCode: string;
  label: string; // Formato: "Cidade - UF"
}

export function getAllCities(): CityWithState[] {
  const allCities: CityWithState[] = [];
  
  Object.entries(brazilianCitiesByState).forEach(([stateCode, cities]) => {
    const state = brazilianStates.find(s => s.value === stateCode);
    if (state) {
      cities.forEach(city => {
        allCities.push({
          city,
          state: state.label,
          stateCode,
          label: `${city} - ${stateCode}`
        });
      });
    }
  });
  
  return allCities.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
}

// Função para buscar cidades por nome
export function searchCities(query: string, limit: number = 50): CityWithState[] {
  if (!query || query.length < 2) return [];
  
  const allCities = getAllCities();
  const normalizedQuery = query.toLowerCase().trim();
  
  return allCities
    .filter(cityData => 
      cityData.city.toLowerCase().includes(normalizedQuery) ||
      cityData.stateCode.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}