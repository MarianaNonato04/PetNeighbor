export function emailDuplicado(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === '23505' || /duplicate|already exists/i.test(e?.message ?? '');
}
