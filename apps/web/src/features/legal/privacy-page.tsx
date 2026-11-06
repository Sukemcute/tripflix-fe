import { vi } from '@tripflix/i18n';
import styles from './legal.module.css';

const copy = vi.privacy;

/** Trang chính sách bảo mật. Mỗi mục có tiêu đề; mục nhiều ý hiện thành danh sách, mục một đoạn hiện thành đoạn văn. */
export function PrivacyPage() {
  return (
    <main id="content" className={`ota-container ${styles.page}`}>
      <article className={styles.card}>
        <header className={styles.header}>
          <h1>{copy.title}</h1>
          <p className={styles.updated}>{copy.updated}</p>
          <p>{copy.intro}</p>
        </header>
        {Object.entries(copy.sections).map(([key, section]) => {
          const { title, ...paragraphs } = section;
          const lines: string[] = Object.values(paragraphs);
          return (
            <section key={key} className={styles.section} aria-labelledby={`privacy-${key}`}>
              <h2 id={`privacy-${key}`}>{title}</h2>
              {lines.length > 1 ? (
                <ul>
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p>{lines[0]}</p>
              )}
            </section>
          );
        })}
      </article>
    </main>
  );
}
