export interface Usuario {
  id_user?: number;
  nome: string;
  idade: number;
  email: string;
  senha?: string;
}

export interface Pet {
  id_pet?: number;
  nome_pet: string;
  idade_pet: number;
  describ_pet: string;
  peso: number;
  porte: 'Pequeno' | 'Médio' | 'Grande';
  id_user: number;
}
