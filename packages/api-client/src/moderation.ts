import {
  adminModerationControllerQueue,
  adminModerationControllerDetail,
  adminModerationControllerDecision,
  adminModerationControllerActions,
  adminModerationControllerCommentAction,
  adminModerationControllerAppeals,
  adminModerationControllerAppealDecision,
  adminModerationControllerFailedScans,
  adminModerationControllerRetryScan,
} from './generated/core-api/moderation-admin/moderation-admin';
import {
  reportsControllerReportPost,
  reportsControllerReportComment,
  reportsControllerMyReports,
  reportsControllerMyDecisions,
  reportsControllerSubmitAppeal,
} from './generated/core-api/moderation-reports/moderation-reports';
import type {
  AdminModerationControllerActionsParams,
  AdminModerationControllerQueueParams,
  DecisionDto,
  ReportDto,
} from './generated/core-api/model';
import { readEntity } from './response';

export const moderationApi = {
  async failedScans(cursor = 0, signal?: AbortSignal) {
    const response = await adminModerationControllerFailedScans(
      { limit: 20, cursor: String(cursor) },
      { signal },
    );
    return readEntity(response.data, ['items', 'nextCursor']);
  },
  async retryScan(id: string) {
    return adminModerationControllerRetryScan(encodeURIComponent(id));
  },
  async myReports(cursor = 0, signal?: AbortSignal) {
    const response = await reportsControllerMyReports({ limit: 20, cursor: String(cursor) }, { signal });
    return readEntity(response.data, ['items', 'nextCursor']);
  },
  async myDecisions(cursor = 0, signal?: AbortSignal) {
    const response = await reportsControllerMyDecisions({ limit: 20, cursor: String(cursor) }, { signal });
    return readEntity(response.data, ['items', 'nextCursor']);
  },
  async submitAppeal(id: string, reason: string) {
    return reportsControllerSubmitAppeal(encodeURIComponent(id), { reason });
  },
  async appeals(cursor = 0, signal?: AbortSignal) {
    const response = await adminModerationControllerAppeals(
      { limit: 20, cursor: String(cursor) },
      { signal },
    );
    return readEntity(response.data, ['items', 'nextCursor']);
  },
  async decideAppeal(id: string, outcome: 'upheld' | 'overturned') {
    return adminModerationControllerAppealDecision(encodeURIComponent(id), { outcome });
  },
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
