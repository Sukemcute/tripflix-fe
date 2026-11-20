import { describe, expect, it, vi } from 'vitest';
import { createTripiSoundPlayer } from './notification-sound';

function player() {
  let time = 0;
  const audio = {
    currentTime: 0,
    volume: 0,
    preload: '',
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  };
  const createAudio = vi.fn(() => audio);
  const sound = createTripiSoundPlayer({ createAudio, now: () => time });
  return {
    sound,
    audio,
    createAudio,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('Tripi notification voice', () => {
  it('đăng nhập giữ activation vừa cấp ở thao tác đăng nhập, đổi tài khoản vẫn dừng tiếng cũ', async () => {
    let unlocked = false;
    const audio = {
      currentTime: 0,
      volume: 0,
      preload: '',
      pause: vi.fn(),
      dispose: vi.fn(() => {
        unlocked = false;
      }),
      unlock: vi.fn(async () => {
        unlocked = true;
        return true;
      }),
      play: vi.fn(async () => {
        if (!unlocked) throw new DOMException('Needs gesture', 'NotAllowedError');
      }),
    };
    const sound = createTripiSoundPlayer({ createAudio: () => audio });
    await sound.prime();
    sound.clearNotifications();
    expect(audio.dispose).not.toHaveBeenCalled();
    expect(await sound.notify('new-user:new-notification', { enabled: true })).toBe(true);
    sound.clearNotifications();
    expect(audio.pause).toHaveBeenCalled();
    expect(await sound.notify('other-user:notification', { enabled: true })).toBe(true);
    sound.reset();
    expect(audio.dispose).toHaveBeenCalledTimes(1);
  });
  it('kích hoạt im lặng trước, sau đó thông báo tự phát được và lỗi bị chặn có trạng thái', async () => {
    let ready = false;
    const blocked = vi.fn(),
      activated = vi.fn();
    const audio = {
      currentTime: 0,
      volume: 0,
      preload: '',
      pause: vi.fn(),
      unlock: vi.fn(async () => {
        ready = true;
        return true;
      }),
      play: vi.fn(async () => {
        if (!ready) throw new DOMException('Needs gesture', 'NotAllowedError');
      }),
    };
    let now = 0;
    const sound = createTripiSoundPlayer({
      createAudio: () => audio,
      now: () => now,
      onBlocked: blocked,
      onReady: activated,
    });
    expect(await sound.notify('u:first', { enabled: true })).toBe(false);
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(await sound.prime()).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
    now = 4000;
    expect(await sound.notify('u:next', { enabled: true })).toBe(true);
    expect(activated).toHaveBeenCalled();
  });
  it('cùng thông báo chỉ đọc một lần dù nhận qua socket và tải lại inbox', async () => {
    const app = player();
    expect(await app.sound.notify('user:notification', { enabled: true })).toBe(true);
    app.advance(5000);
    expect(await app.sound.notify('user:notification', { enabled: true })).toBe(false);
    expect(app.audio.play).toHaveBeenCalledTimes(1);
  });
  it('không phát dồn giọng khi nhiều thông báo tới liên tiếp', async () => {
    const app = player();
    expect(await app.sound.notify('u:a', { enabled: true })).toBe(true);
    app.advance(100);
    expect(await app.sound.notify('u:b', { enabled: true })).toBe(false);
    app.advance(3000);
    expect(await app.sound.notify('u:c', { enabled: true })).toBe(true);
    expect(app.audio.play).toHaveBeenCalledTimes(2);
  });
  it('tắt tiếng không tải hoặc phát audio; nghe thử vẫn là thao tác riêng của người dùng', async () => {
    const app = player();
    expect(await app.sound.notify('u:a', { enabled: false })).toBe(false);
    expect(app.createAudio).not.toHaveBeenCalled();
    expect(await app.sound.preview()).toBe(true);
    expect(await app.sound.notify('u:a', { enabled: true })).toBe(false);
    expect(app.audio.play).toHaveBeenCalledTimes(1);
  });
  it('autoplay bị chặn không ném lỗi hoặc làm hỏng luồng thông báo', async () => {
    const app = player();
    app.audio.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(app.sound.notify('u:a', { enabled: true })).resolves.toBe(false);
    await expect(app.sound.preview()).resolves.toBe(true);
  });
  it('logout/remount dừng audio, xóa trạng thái và vẫn dùng được cho phiên sau', async () => {
    const app = player();
    await app.sound.notify('u:a', { enabled: true });
    app.sound.reset();
    expect(app.audio.pause).toHaveBeenCalled();
    expect(app.audio.currentTime).toBe(0);
    expect(await app.sound.notify('u:a', { enabled: true })).toBe(true);
    expect(app.createAudio).toHaveBeenCalledTimes(2);
  });
  it('tắt tiếng khi play đang chờ không báo nhầm là đã phát thành công', async () => {
    const app = player();
    let finish!: () => void;
    app.audio.play.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = app.sound.notify('u:a', { enabled: true });
    app.sound.stop();
    finish();
    expect(await pending).toBe(false);
    expect(app.audio.pause).toHaveBeenCalledTimes(2);
  });
});
