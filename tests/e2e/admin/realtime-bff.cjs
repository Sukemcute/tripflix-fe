// Runs a built admin against isolated HTTP + Socket.IO fixtures, never against a real account.
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { join } = require('node:path');
const { Server } = require(
  process.env.SOCKET_IO_PACKAGE ||
    join(__dirname, '../../../..', 'tripflix-be/apps/notification-service/node_modules/socket.io'),
);
const adminDirectory = join(__dirname, '../../..', 'apps/admin');
const nextCli = require.resolve('next/dist/bin/next', { paths: [adminDirectory] });
const accessToken = 'fixture-token-kept-only-on-server';

async function main() {
  const upstream = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/auth/login') {
      response.setHeader('Set-Cookie', 'tripflix_refresh=fixture-refresh; HttpOnly; Path=/');
      response.end(JSON.stringify({ accessToken, expiresIn: 3600 }));
    } else if (request.url === '/api/admin/me') {
      assert.equal(request.headers.authorization, `Bearer ${accessToken}`);
      response.end(
        JSON.stringify({
          id: '11111111-1111-4111-8111-111111111111',
          role: 'moderator',
          displayName: 'Fixture staff',
          email: 'staff@example.test',
        }),
      );
    } else if (request.url === '/api/auth/logout') {
      response.statusCode = 204;
      response.end();
    } else {
      response.statusCode = 404;
      response.end('{}');
    }
  });
  const sockets = new Server(upstream, { path: '/ws', transports: ['websocket'] });
  sockets.use((socket, next) =>
    socket.handshake.auth.token === accessToken ? next() : next(new Error('unauthorized')),
  );
  sockets.on('connection', (socket) => socket.emit('moderation.ready', {}));
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  const port = process.env.ADMIN_BFF_TEST_PORT || '3211';
  const base = `http://localhost:${port}`;
  let logs = '';
  const child = spawn(process.execPath, [nextCli, 'start', '--port', port], {
    cwd: adminDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ADMIN_ORIGIN: base,
      ADMIN_CORE_API_URL: upstreamUrl,
      ADMIN_REALTIME_URL: upstreamUrl,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    logs += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    logs += String(chunk);
  });
  const abort = new AbortController();
  try {
    const deadline = Date.now() + 30_000;
    while (true) {
      if (child.exitCode !== null) throw new Error(`Admin exited: ${logs}`);
      try {
        if ((await fetch(base + '/healthz')).ok) break;
      } catch {}
      if (Date.now() > deadline) throw new Error(`Admin did not start: ${logs}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal((await fetch(base + '/bff/api/admin/realtime')).status, 401);
    const login = await fetch(base + '/bff/api/auth/login', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@example.test', encPassword: 'isolated-fixture-only' }),
    });
    assert.equal(login.status, 204);
    assert.equal(await login.text(), '');
    const cookie = login.headers
      .getSetCookie()
      .find((value) => value.startsWith('__Host-tripflix-admin='))
      .split(';')[0];
    const headers = { Cookie: cookie, Origin: base };
    assert.equal(
      (
        await fetch(base + '/bff/api/admin/realtime', {
          headers: { ...headers, Origin: 'https://other.test' },
        })
      ).status,
      403,
    );
    const connected = once(sockets, 'connection');
    const response = await fetch(base + '/bff/api/admin/realtime', { headers, signal: abort.signal });
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const [socket] = await connected;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = '';
    async function until(pattern) {
      const readDeadline = Date.now() + 15_000;
      while (!pattern.test(received)) {
        const result = await Promise.race([
          reader.read(),
          new Promise((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error('SSE timeout')),
              Math.max(1, readDeadline - Date.now()),
            );
            timer.unref();
          }),
        ]);
        if (result.done) break;
        received += decoder.decode(result.value);
      }
      assert.match(received, pattern);
    }
    await until(/event: ready/);
    socket.emit('moderation.changed', { token: accessToken, privateContent: 'should-never-reach-browser' });
    await until(/event: moderation.changed/);
    assert.ok(!received.includes(accessToken));
    assert.ok(!received.includes('privateContent'));
    assert.ok(!received.includes('should-never-reach-browser'));
    const disconnected = once(socket, 'disconnect');
    const logout = await fetch(base + '/bff/api/auth/logout', { method: 'POST', headers });
    assert.equal(logout.status, 204);
    socket.emit('moderation.changed', {});
    await disconnected;
    assert.equal((await reader.read()).done, true);
    assert.equal((await fetch(base + '/bff/api/admin/realtime', { headers })).status, 401);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          'unauthenticated',
          'cross-origin',
          'socket-through-BFF',
          'no-token-in-browser',
          'logout-disconnect',
        ],
      }),
    );
  } finally {
    abort.abort();
    child.kill();
    await new Promise((resolve) => sockets.close(resolve));
    upstream.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
