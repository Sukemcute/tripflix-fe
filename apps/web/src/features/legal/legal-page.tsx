import styles from './legal.module.css';

/** Văn bản pháp lý: tiêu đề, ngày cập nhật, mở đầu và các mục (mỗi mục có `title` và một hay nhiều đoạn). */
export interface LegalCopy {
  title: string;
  updated: string;
  intro: string;
  sections: Readonly<Record<string, { readonly title: string } & Readonly<Record<string, string>>>>;
}

/** Mục nhiều ý hiện thành danh sách, mục một đoạn hiện thành đoạn văn. */
export function LegalPage({ copy, idPrefix }: { copy: LegalCopy; idPrefix: string }) {
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
            <section key={key} className={styles.section} aria-labelledby={`${idPrefix}-${key}`}>
              <h2 id={`${idPrefix}-${key}`}>{title}</h2>
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
