import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGenieRenderer } from './genie-renderer';

afterEach(() => vi.unstubAllGlobals());

describe('khớp lớp animation với khung chat khi có scrollbar-gutter', () => {
  it('chiếu theo kích thước canvas thật, không dùng innerWidth lớn hơn 17px', () => {
    const gl = {
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 2,
      COMPILE_STATUS: 3,
      LINK_STATUS: 4,
      ARRAY_BUFFER: 5,
      ELEMENT_ARRAY_BUFFER: 6,
      FLOAT: 7,
      STATIC_DRAW: 8,
      TEXTURE_2D: 9,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 10,
      RGBA: 11,
      UNSIGNED_BYTE: 12,
      TEXTURE_MIN_FILTER: 13,
      TEXTURE_MAG_FILTER: 14,
      LINEAR: 15,
      TEXTURE_WRAP_S: 16,
      TEXTURE_WRAP_T: 17,
      CLAMP_TO_EDGE: 18,
      BLEND: 19,
      ONE: 20,
      ONE_MINUS_SRC_ALPHA: 21,
      DYNAMIC_DRAW: 22,
      COLOR_BUFFER_BIT: 23,
      TRIANGLES: 24,
      UNSIGNED_SHORT: 25,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      createTexture: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      bufferData: vi.fn(),
      bindTexture: vi.fn(),
      pixelStorei: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      getUniformLocation: vi.fn((_program, name: string) => name),
      uniform2f: vi.fn(),
      uniform1f: vi.fn(),
      viewport: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      clear: vi.fn(),
      drawElements: vi.fn(),
      deleteTexture: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
      getExtension: vi.fn(() => null),
    };
    const canvas = {
      style: {},
      width: 0,
      height: 0,
      setAttribute: vi.fn(),
      remove: vi.fn(),
      getContext: vi.fn(() => gl),
      getBoundingClientRect: vi.fn(() => ({ left: 4, top: 0, width: 1888, height: 900 })),
    };
    vi.stubGlobal('window', { innerWidth: 1905, innerHeight: 900, devicePixelRatio: 1.25 });
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas), body: { appendChild: vi.fn() } });
    const renderer = createGenieRenderer({} as HTMLCanvasElement, {
      left: 1400,
      top: 120,
      width: 420,
      height: 640,
      anchorX: 1660,
      anchorY: 70,
    });
    expect(gl.uniform2f).toHaveBeenCalledWith('viewport', 1888, 900);
    expect(canvas.width).toBe(2360);
    renderer.draw(1);
    const upload = gl.bufferData.mock.calls.findLast((call) => call[1] instanceof Float32Array);
    const vertices = upload?.[1] as Float32Array;
    expect(vertices[0]).toBe(1396);
    // Góc phải của texture, sau khi đổi lại hệ tọa độ canvas, đúng bằng mép phải DOM.
    expect((vertices[20 * 5] ?? 0) + 4).toBe(1820);
    renderer.dispose();
  });
});
