import {
  adminModerationControllerQueue,
  adminModerationControllerDetail,
  adminModerationControllerDecision,
  adminModerationControllerActions,
  adminModerationControllerCommentAction,
} from './generated/core-api/moderation-admin/moderation-admin';
import {
  reportsControllerReportPost,
  reportsControllerReportComment,
} from './generated/core-api/moderation-reports/moderation-reports';
import type {
  AdminModerationControllerActionsParams,
  AdminModerationControllerQueueParams,
  DecisionDto,
  ReportDto,
} from './generated/core-api/model';
import { readEntity } from './response';

export const moderationApi = {
  async queue(query: AdminModerationControllerQueueParams, signal?: AbortSignal) {
    return readEntity((await adminModerationControllerQueue(query, { signal })).data, [
      'items',
      'total',
      'nextCursor',
    ]);
  },
  async detail(id: string, signal?: AbortSignal) {
    return readEntity((await adminModerationControllerDetail(encodeURIComponent(id), { signal })).data, [
      'id',
      'target',
      'reports',
      'actions',
    ]);
  },
  async decide(id: string, body: DecisionDto) {
    return (await adminModerationControllerDecision(encodeURIComponent(id), body)).data;
  },
  async commentAction(id: string, body: DecisionDto) {
    return (await adminModerationControllerCommentAction(encodeURIComponent(id), body)).data;
  },
  async log(query: AdminModerationControllerActionsParams = {}, signal?: AbortSignal) {
    return readEntity((await adminModerationControllerActions(query, { signal })).data, [
      'items',
      'nextCursor',
    ]);
  },
  async report(targetType: 'post' | 'comment', id: string, body: ReportDto) {
    return (
      await (targetType === 'post' ? reportsControllerReportPost : reportsControllerReportComment)(
        encodeURIComponent(id),
        body,
      )
    ).data;
  },
};
