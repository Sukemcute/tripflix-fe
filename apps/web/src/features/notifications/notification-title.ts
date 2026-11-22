export function notificationTitle(title: string, unreadCount: number): string {
  const base = title.replace(/^\(\d+\+?\)\s+/, '');
  return unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}` : base;
}

/** Next thay title khi chuyển trang; giữ nguyên tên trang bên sau số chưa đọc. */
export function observeNotificationTitle(unreadCount: number): () => void {
  const update = () => {
    const next = notificationTitle(document.title, unreadCount);
    if (document.title !== next) document.title = next;
  };
  const observer = new MutationObserver(update);
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  update();
  return () => {
    observer.disconnect();
    document.title = notificationTitle(document.title, 0);
  };
}
