import { environment } from '../../environments/environment';

export function fotoSegura(url?: string | null): string | null {
  return url && url.startsWith(environment.fotoUrlPrefix) ? url : null;
}

const FOTO_ANTIGA = /^data:image\/(png|jpe?g|gif|webp|avif);base64,/;

export function fotoPostSegura(url?: string | null): string | null {
  return fotoSegura(url) ?? (url && FOTO_ANTIGA.test(url) ? url : null);
}

export async function comprimirImagem(arquivo: Blob, ladoMaximo = 1280, qualidade = 0.82): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  imagem.close();
  return new Promise((ok, falha) =>
    canvas.toBlob(b => (b ? ok(b) : falha(new Error('Não foi possível processar a imagem.'))), 'image/jpeg', qualidade)
  );
}
