import { io } from 'socket.io-client';

interface RealtimeSession {
  access: string;
  accessExpiresAt: number;
  expires: number;
  closing?: boolean;
}

/** BFF giữ token ở server; trình duyệt chỉ nhận tín hiệu vô hiệu hoá cache qua SSE. */
export function createAdminEventStream(options: {
  url: string;
  signal: AbortSignal;
  getSession: () => RealtimeSession | undefined;
}): Response {
  let dispose = () => {};
  let isCancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;
      const socket = io(options.url, {
        path: '/ws',
        transports: ['websocket'],
        autoConnect: false,
        auth: (send) => send({ token: options.getSession()?.access ?? null }),
        reconnectionDelay: 3_000,
        reconnectionDelayMax: 15_000,
      });
      const emit = (event: string) => {
        if (!isClosed) controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
      };
      const isValid = () => {
        const session = options.getSession();
        return (
          session && !session.closing && session.expires > Date.now() && session.accessExpiresAt > Date.now()
        );
      };
      const heartbeat = setInterval(() => {
        if (!isValid()) {
          dispose();
          return;
        }
        if (!isClosed) controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 10_000);
      dispose = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeat);
        options.signal.removeEventListener('abort', dispose);
        socket.disconnect();
        if (!isCancelled) controller.close();
      };
      options.signal.addEventListener('abort', dispose, { once: true });
      socket.on('moderation.ready', () => {
        if (isValid()) emit('ready');
        else dispose();
      });
      // Không chuyển nội dung hay mã định danh của sự kiện lên trình duyệt.
      socket.on('moderation.changed', () => {
        if (isValid()) emit('moderation.changed');
        else dispose();
      });
      socket.on('disconnect', () => emit('reconnecting'));
      socket.on('connect_error', () => emit('reconnecting'));
      socket.on('auth.expired', dispose);
      controller.enqueue(encoder.encode('retry: 5000\n\n'));
      if (options.signal.aborted || !isValid()) dispose();
      else socket.connect();
    },
    cancel() {
      isCancelled = true;
      dispose();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
