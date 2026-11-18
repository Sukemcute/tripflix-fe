import { getGenieVertex, type GenieSurface } from './genie-motion';

export type GenieRenderer = { draw: (openness: number) => void; dispose: () => void };

/** Texture được kéo bằng lưới WebGL, thay vì cắt mất phần chữ ở mép khung. */
export function createGenieRenderer(texture: HTMLCanvasElement, surface: GenieSurface): GenieRenderer {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '61',
    pointerEvents: 'none',
  });
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) throw new Error('WebGL unavailable');
  try {
    document.body.appendChild(canvas);
    // Khung fixed không bao gồm scrollbar-gutter; innerWidth có tính phần này và làm texture bị co ngang.
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const viewportWidth = bounds.width;
    const viewportHeight = bounds.height;
    canvas.width = Math.ceil(viewportWidth * ratio);
    canvas.height = Math.ceil(viewportHeight * ratio);
    const shader = (type: number, source: string): WebGLShader => {
      const result = gl.createShader(type);
      if (!result) throw new Error('Shader unavailable');
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return result;
    };
    const vertexShader = shader(
      gl.VERTEX_SHADER,
      `
    attribute vec2 position; attribute vec2 uv; attribute float shade;
    uniform vec2 viewport; varying vec2 texcoord; varying float light;
    void main(){gl_Position=vec4(position.x/viewport.x*2.0-1.0,1.0-position.y/viewport.y*2.0,0.0,1.0);texcoord=uv;light=shade;}`,
    );
    const fragmentShader = shader(
      gl.FRAGMENT_SHADER,
      `
    precision mediump float; uniform sampler2D image; uniform float opacity;
    varying vec2 texcoord; varying float light;
    void main(){gl_FragColor=texture2D(image,texcoord)*vec4(vec3(light),1.0)*opacity;}`,
    );
    const program = gl.createProgram();
    if (!program) throw new Error('Program unavailable');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
    gl.useProgram(program);
    const columns = 20;
    const rows = 96;
    const vertices = new Float32Array((columns + 1) * (rows + 1) * 5);
    const indices: number[] = [];
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const first = row * (columns + 1) + column;
        const next = first + columns + 1;
        indices.push(first, next, first + 1, first + 1, next, next + 1);
      }
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const image = gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    for (const [name, size, offset] of [
      ['position', 2, 0],
      ['uv', 2, 8],
      ['shade', 1, 16],
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(gl.getUniformLocation(program, 'viewport'), viewportWidth, viewportHeight);
    const opacity = gl.getUniformLocation(program, 'opacity');
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return {
      draw: (openness) => {
        for (let row = 0; row <= rows; row++)
          for (let column = 0; column <= columns; column++) {
            const u = column / columns;
            const v = row / rows;
            const point = getGenieVertex(u, v, openness, surface);
            const offset = (row * (columns + 1) + column) * 5;
            vertices[offset] = point.x - bounds.left;
            vertices[offset + 1] = point.y - bounds.top;
            vertices[offset + 2] = u;
            vertices[offset + 3] = v;
            vertices[offset + 4] = point.shade;
          }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        gl.uniform1f(opacity, Math.min(1, openness / 0.06));
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      },
      dispose: () => {
        canvas.remove();
        gl.deleteTexture(image);
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  } catch (error) {
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
}
