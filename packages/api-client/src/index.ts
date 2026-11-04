// Hook và type sinh ra import theo đường dẫn con, ví dụ:
//   import { useHealthControllerCheck } from '@tripflix/api-client/core-api/health/health';
//   import type { ParseQueryResponse } from '@tripflix/api-client/ai-service/model';
export { configureHttp, http, HttpError, type HttpConfig, type HttpResponse } from './http';
