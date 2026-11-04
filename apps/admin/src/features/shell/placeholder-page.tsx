import { t, type MessageKey } from '@tripflix/i18n';
import { adminNav } from './nav';

/** Trang tạm cho mục chưa làm. Chủ mục thay bằng component trong features/<mục>/. */
export function PlaceholderPage({ label }: { label: MessageKey }) {
  const owner = adminNav.find((item) => item.label === label)?.owner;
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-navy">{t(label)}</h1>
      <p className="text-text-muted">
        {t('common.comingSoon')}
        {owner ? ` · ${owner}` : ''}
      </p>
    </section>
  );
}
