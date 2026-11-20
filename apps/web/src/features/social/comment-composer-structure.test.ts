import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'live-posts.tsx'), 'utf8');

describe('comment rendering boundary', () => {
  it('keeps typing state inside composer and memoizes comment nodes', () => {
    const parent = source.slice(source.indexOf('export function RightPanelCommentsSynchronized'), source.indexOf('interface CommentComposerHandle'));
    const composer = source.slice(source.indexOf('function CommentComposer('), source.indexOf('function renderMentionMirrorContent'));
    const commentNode = source.slice(source.indexOf('const CommentNode = memo(function CommentNodeImpl'), source.indexOf('export interface ComposerModalProps'));

    expect(parent).not.toContain('const [body, setBody]');
    expect(parent).toContain('<CommentComposer');
    expect(parent).toContain('key={post.id}');
    expect(parent).toContain('onReplySelect={handleReplySelect}');
    expect(parent).toContain('onJumpToComment={handleJumpToComment}');
    expect(parent).not.toContain('onReplySelect={(');

    expect(composer).toContain('const [body, setBody]');
    expect(composer).toContain('onBlur={commentDraftStore.flush}');
    expect(composer).toContain("window.addEventListener('pagehide', commentDraftStore.flush)");
    expect(composer).toContain('sameMentionQuery');
    expect(composer).toContain('isMentionNavigationKey');
    expect(composer).toContain('onClose={closeMentionPicker}');
    expect(composer).toContain('onClose={closeEmojiPicker}');
    expect(composer).not.toContain('onClose={() =>');

    expect(source).toContain('const CommentNode = memo(function CommentNodeImpl');
    expect(commentNode).toContain('edit:${postId}:${comment.id}');
    expect(commentNode).toContain('onBlur={commentDraftStore.flush}');
    expect(commentNode).toContain('sameMentionQuery');
    expect(commentNode).toContain('isMentionNavigationKey');
    expect(commentNode).toContain('onClose={closeEditMentionPicker}');
    expect(commentNode).not.toContain('onClose={() =>');
  });
});
