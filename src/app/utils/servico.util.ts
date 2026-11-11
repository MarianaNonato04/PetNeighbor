const ICONES: Record<string, string> = { 'Passeio': 'directions_walk', 'Alimentação': 'restaurant', 'Companhia': 'favorite' };

export function iconeServico(tipo: string): string {
  return ICONES[tipo.split(',')[0].trim()] ?? 'pets';
}
