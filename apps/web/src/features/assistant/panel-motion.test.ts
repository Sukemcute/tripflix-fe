import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getPanelCloseTimeoutMs,
  getPanelVisibility,
  PANEL_CLOSE_FALLBACK_BUFFER_MS,
  PANEL_CLOSE_MS,
  PANEL_OPEN_MS,
  reducePanelPresence,
  shouldCompletePanelClose,
} from './panel-motion';

describe('hiệu ứng mở/đóng khung Tripi (fade + trượt nhẹ)', () => {
  it('thời lượng mở và đóng nằm trong khoảng 150-200ms', () => {
    expect(PANEL_OPEN_MS).toBeGreaterThanOrEqual(150);
    expect(PANEL_OPEN_MS).toBeLessThanOrEqual(200);
    expect(PANEL_CLOSE_MS).toBeGreaterThanOrEqual(150);
    expect(PANEL_CLOSE_MS).toBeLessThanOrEqual(200);
  });

  it('khi đóng giữ panel qua isExiting để chạy hết animation rồi mới gỡ', () => {
    let state = { lastIsOpen: false, isExiting: false };
    expect(getPanelVisibility(false, state.isExiting)).toEqual({ isClosing: false, rendered: false });

    // Mở khung
    state = reducePanelPresence(state, true);
    expect(state).toEqual({ lastIsOpen: true, isExiting: false });
    expect(getPanelVisibility(true, state.isExiting)).toEqual({ isClosing: false, rendered: true });

    // Đóng khung -> giữ DOM (rendered = true, isClosing = true)
    state = reducePanelPresence(state, false);
    expect(state).toEqual({ lastIsOpen: false, isExiting: true });
    expect(getPanelVisibility(false, state.isExiting)).toEqual({ isClosing: true, rendered: true });
  });

  it('bấm đóng/mở liên tục không bị kẹt trạng thái đóng hoặc biến mất đột ngột', () => {
    let state = { lastIsOpen: false, isExiting: false };

    // Mở -> đóng (đang chạy animation đóng)
    state = reducePanelPresence(state, true);
    state = reducePanelPresence(state, false);
    expect(getPanelVisibility(false, state.isExiting)).toEqual({ isClosing: true, rendered: true });

    // Mở lại ngay khi animation đóng chưa xong -> huỷ isExiting, panel vẫn ở lại và mở tiếp
    state = reducePanelPresence(state, true);
    expect(state).toEqual({ lastIsOpen: true, isExiting: false });
    expect(getPanelVisibility(true, state.isExiting)).toEqual({ isClosing: false, rendered: true });

    // Đóng lần 2 -> tiếp tục chạy animation đóng bình thường
    state = reducePanelPresence(state, false);
    expect(state).toEqual({ lastIsOpen: false, isExiting: true });
    expect(getPanelVisibility(false, state.isExiting)).toEqual({ isClosing: true, rendered: true });
  });

  it('chỉ kết thúc đóng khi animationend đến từ chính panel và đang đóng', () => {
    const panelEl = { id: 'tripi-assistant-panel' };
    const childEl = { id: 'pending-dot' };

    expect(shouldCompletePanelClose(panelEl, panelEl, false)).toBe(false);
    expect(shouldCompletePanelClose(childEl, panelEl, true)).toBe(false);
    expect(shouldCompletePanelClose(panelEl, panelEl, true)).toBe(true);
  });

  it('prefers-reduced-motion gỡ ngay lập tức (0ms), bình thường chờ đủ animation đóng + đệm', () => {
    expect(getPanelCloseTimeoutMs(true)).toBe(0);
    expect(getPanelCloseTimeoutMs(false)).toBe(PANEL_CLOSE_MS + PANEL_CLOSE_FALLBACK_BUFFER_MS);
  });

  it('CSS dùng fade + trượt nhẹ 180ms ease-out, bỏ scale/genie và tắt animation khi reduced-motion', () => {
    const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'assistant.module.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('@keyframes panel-open');
    expect(css).toContain('@keyframes panel-close');
    expect(css).toContain('animation: panel-open 180ms ease-out both;');
    expect(css).toContain('animation: panel-close 180ms ease-out forwards;');
    expect(css).toContain('translateY(-6px)');
    expect(css).not.toContain('transform-origin: var(--panel-origin-x');
    expect(css).not.toMatch(/@keyframes panel-(?:open|close)[\s\S]*?scale\(/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.panelClosing[\s\S]*?animation: none;/);
  });
});
