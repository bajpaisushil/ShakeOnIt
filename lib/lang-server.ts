import { cookies } from 'next/headers';
import { isLang, type Lang } from './i18n';

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const v = jar.get('shake_lang')?.value;
  return isLang(v) ? v : 'en';
}
