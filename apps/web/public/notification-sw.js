/* TF46: không cache trang/API và không giữ token đăng nhập trong worker. */
const DATABASE = 'tripflix-notifications-v1';
const MAX_AGE = 24 * 60 * 60 * 1000;
let messageQueue = Promise.resolve();

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('state');
      const claims = db.createObjectStore('claims', { keyPath: 'key' });
      claims.createIndex('expires', 'expires');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function state(key, value, write = false) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('state', write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('state');
      const request = write ? store.put(value, key) : store.get(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Giao dịch IDB dùng chung giữa mọi tab, socket và push: chỉ một bên giành được quyền hiện. */
async function claim(userId, id) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('claims', 'readwrite');
      const store = tx.objectStore('claims');
      const key = `${userId}:${id}`;
      let acquired = false;
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.expires > Date.now()) return;
        acquired = true;
        store.put({ key, expires: Date.now() + MAX_AGE });
      };
      let removed = 0;
      const expired = store.index('expires').openCursor(IDBKeyRange.upperBound(Date.now()));
      expired.onsuccess = () => {
        const cursor = expired.result;
        if (cursor && removed++ < 100) {
          // Không xóa bản claim vừa gia hạn trong chính giao dịch này.
          if (cursor.primaryKey !== key) cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(acquired);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function safeHref(href) {
  try {
    const url = new URL(href || '/', self.location.origin);
    return url.origin === self.location.origin && /^https?:$/.test(url.protocol)
      ? url.pathname + url.search + url.hash
      : '/';
  } catch {
    return '/';
  }
}

function isItem(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    item.id.length <= 100 &&
    typeof item.title === 'string' &&
    typeof item.body === 'string'
  );
}

async function present(message, isPush) {
  const owner = await state('owner');
  if (!owner) return 'deferred';
  if (owner.userId !== message.userId || !isItem(message.item)) return 'ignored';
  if (isPush && owner.subscriptionId !== message.subscriptionId) return 'ignored';
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const focused = windows.find((client) => client.visibilityState === 'visible' && client.focused);
  // Tab còn hiển thị (dù mất focus, vd. đang bình luận ở cửa sổ khác) vẫn nhận thẻ để có âm Tripi.
  const target = focused ?? (!isPush ? windows.find((client) => client.visibilityState === 'visible') : null);
  // Socket ở nền chỉ làm mới inbox. Push đảm nhận thông báo hệ điều hành, không phụ thuộc tab còn chạy JS.
  if (!isPush && !target) return 'deferred';
  if (!(await claim(owner.userId, message.item.id))) return 'duplicate';
  // Đọc lại sau await để không hiện dữ liệu tài khoản cũ lúc vừa đăng xuất.
  const current = await state('owner');
  if (current?.userId !== owner.userId || current?.subscriptionId !== owner.subscriptionId) return 'ignored';
  if (target) {
    target.postMessage({ type: 'NOTIFICATION_TOAST', userId: owner.userId, item: message.item });
  } else {
    await self.registration.showNotification(message.item.title.slice(0, 160), {
      body: message.item.body.slice(0, 300),
      icon: '/brand/tripflix-gmail-avatar-icon.svg',
      tag: `tripflix:${owner.userId}:${message.item.id}`,
      data: { userId: owner.userId, id: message.item.id, href: safeHref(message.href) },
    });
  }
  windows.forEach((client) => client.postMessage({ type: 'NOTIFICATION_INVALIDATE', userId: owner.userId }));
  return 'shown';
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await present(event.data?.json(), true);
      } catch {
        /* Inbox vẫn giữ thông báo nếu payload hỏng. */
      }
    })(),
  );
});
self.addEventListener('message', (event) => {
  const task = messageQueue.then(async () => {
    const client = event.source;
    if (!client?.url || new URL(client.url).origin !== self.location.origin) return;
    const message = event.data;
    if (message?.type === 'NOTIFICATION_OWNER' && typeof message.userId === 'string') {
      const previous = await state('owner');
      await state(
        'owner',
        {
          userId: message.userId,
          subscriptionId:
            message.subscriptionId ?? (previous?.userId === message.userId ? previous.subscriptionId : null),
        },
        true,
      );
      if (previous?.userId !== message.userId) {
        (await self.registration.getNotifications()).forEach((item) => item.close());
        await state('click', null, true);
      }
    } else if (message?.type === 'NOTIFICATION_LOGOUT') {
      const owner = await state('owner');
      if (owner && (!message.userId || owner.userId === message.userId)) {
        await state('owner', null, true);
        await state('click', null, true);
        (await self.registration.getNotifications()).forEach((item) => item.close());
        await (await self.registration.pushManager.getSubscription())?.unsubscribe();
      }
    } else if (message?.type === 'NOTIFICATION_PRESENT') {
      const presentation = await present(message, false);
      event.ports?.[0]?.postMessage({ ok: true, presentation });
      return;
    } else if (message?.type === 'NOTIFICATION_DRAIN') {
      const click = await state('click');
      if (click?.userId === message.userId) {
        client.postMessage({ type: 'NOTIFICATION_CLICK', ...click });
        await state('click', null, true);
      }
    }
    event.ports?.[0]?.postMessage({ ok: true });
  });
  messageQueue = task.catch(() => event.ports?.[0]?.postMessage({ ok: false }));
  event.waitUntil(messageQueue);
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const click = event.notification.data;
      const owner = await state('owner');
      if (!owner || owner.userId !== click?.userId) return;
      const href = safeHref(click.href);
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((entry) => entry.visibilityState === 'visible') ?? windows[0];
      if (client) {
        await client.focus();
        client.postMessage({ type: 'NOTIFICATION_CLICK', ...click, href });
      } else {
        await state('click', { ...click, href }, true);
        await self.clients.openWindow(href);
      }
    })(),
  );
});
