/**
 * Formata uma mensagem de detalhes do frete para o chat
 * @param freightData - Dados do frete
 * @returns Mensagem formatada sem asteriscos (notação Markdown)
 */
export function formatFreightChatMessage(freightData: any): string {
  const origin = `${freightData.origin?.city || 'Não informado'}/${freightData.origin?.state || ''}`;
  const destination = `${freightData.destination?.city || 'Não informado'}/${freightData.destination?.state || ''}`;
  const freightCode = freightData.freight_code || `#${freightData.id.substring(0, 7).toUpperCase()}`;
  
  let message = `📦 Detalhes do Frete ${freightCode}\n\n`;
  message += `📍 Origem: ${origin}\n`;
  message += `📍 Destino: ${destination}\n`;
  message += `📦 Carga: ${freightData.cargo || 'Não especificado'}\n`;
  message += `⚖️ Peso: ${freightData.weight || 'Não especificado'}\n`;
  
  if (freightData.product) {
    message += `📋 Produto: ${freightData.product}\n`;
  }
  
  if (freightData.truckType) {
    message += `🚚 Veículos: ${freightData.truckType}\n`;
  }
  
  if (freightData.trailerType) {
    message += `🚛 Carrocerias: ${freightData.trailerType}\n`;
  }
  
  if (freightData.price && freightData.price !== 'A combinar') {
    message += `💰 Valor: ${freightData.price}\n`;
  }
  
  if (freightData.pickupDate) {
    const pickupDateStr = new Date(freightData.pickupDate).toLocaleDateString('pt-BR');
    message += `📅 Data de Coleta: ${pickupDateStr}\n`;
  }
  
  if (freightData.deliveryDate) {
    const deliveryDateStr = new Date(freightData.deliveryDate).toLocaleDateString('pt-BR');
    message += `📅 Data de Entrega: ${deliveryDateStr}\n`;
  }
  
  if (freightData.observations) {
    message += `\n📝 Observações:\n${freightData.observations}`;
  }
  
  return message;
}
