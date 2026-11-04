import { defineConfig } from 'orval';

// Đọc hợp đồng từ 2 repo đặt cạnh (docs/11 §2.1): ../tripflix-be và ../tripflix-ai.
// Sinh hook TanStack Query + type vào src/generated/. File sinh ra có commit; không sửa tay.
const output = (name: string) => ({
  mode: 'tags-split' as const,
  target: `src/generated/${name}`,
  schemas: `src/generated/${name}/model`,
  client: 'react-query' as const,
  httpClient: 'fetch' as const,
  clean: true,
  override: {
    mutator: { path: 'src/http.ts', name: 'http' },
  },
});

export default defineConfig({
  coreApi: {
    input: { target: '../../../tripflix-be/contracts/openapi/core-api.json' },
    output: output('core-api'),
  },
  aiService: {
    input: { target: '../../../tripflix-ai/contracts/openapi/ai-service.json' },
    output: output('ai-service'),
  },
});
