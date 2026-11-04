import { t } from '@tripflix/i18n';
import { Button } from '@tripflix/ui-web';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
      <p className="font-semibold text-coral">{t('app.name')}</p>
      <h1 className="text-4xl font-extrabold text-navy">{t('web.heroTitle')}</h1>
      <p className="text-lg text-text-muted">{t('web.heroBody')}</p>
      <div>
        <Button size="lg">{t('tabs.explore')}</Button>
      </div>
    </main>
  );
}
