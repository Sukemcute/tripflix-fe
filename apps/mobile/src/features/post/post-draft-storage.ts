import { parsePostDraftRecovery, type PostDraftRecovery } from '@tripflix/app-core';
import { File, Paths } from 'expo-file-system';
import { resolveVideoMimeType } from '@tripflix/api-client';
import { Platform } from 'react-native';
import { fileVideoSource, type PickedVideo } from './video-source';

let pendingWrite = Promise.resolve();
export const postDraftStorageKey = (userId: string, editorKey: string) =>
  `tripflix.postDraft.v1.${encodeURIComponent(userId)}.${encodeURIComponent(editorKey)}`;

function readRaw(key: string): string | null | Promise<string> {
  if (Platform.OS === 'web') return globalThis.localStorage.getItem(key);
  const file = new File(Paths.document, `${key}.json`);
  const pending = new File(Paths.document, `${key}.writing.json`);
  return file.exists ? file.text() : pending.exists ? pending.text() : null;
}

function writeRaw(key: string, value: string | null): void | Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, value);
    return;
  }
  const file = new File(Paths.document, `${key}.json`);
  const pending = new File(Paths.document, `${key}.writing.json`);
  if (value === null) {
    if (file.exists) file.delete();
    if (pending.exists) pending.delete();
  } else {
    if (!pending.exists) pending.create();
    // Replace the previous copy only after the complete new JSON has reached disk.
    return pending.write(value).then(() => pending.move(file, { overwrite: true }));
  }
}

export async function readPostDraft(userId: string, editorKey: string): Promise<PostDraftRecovery | null> {
  await pendingWrite;
  const raw = await readRaw(postDraftStorageKey(userId, editorKey));
  const saved = parsePostDraftRecovery(raw, userId, editorKey);
  if (raw && !saved) throw new Error('Invalid device post draft');
  return saved;
}

export function writePostDraft(
  userId: string,
  editorKey: string,
  draft: PostDraftRecovery | null,
): Promise<void> {
  const key = postDraftStorageKey(userId, editorKey);
  const serialized = draft ? JSON.stringify(draft) : null;
  if (serialized && serialized.length > 1_000_000)
    return Promise.reject(new Error('Device post draft is too large'));
  // Web writes synchronously so pagehide cannot outrun the final edit.
  if (Platform.OS === 'web') {
    try {
      writeRaw(key, serialized);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  const writing = pendingWrite.then(() => writeRaw(key, serialized));
  pendingWrite = writing.catch(() => undefined);
  return writing;
}

/** Publishing an old background job must not delete a newer draft started meanwhile. */
export function clearPublishedPostDraft(saved: PostDraftRecovery): Promise<void> {
  const clear = async () => {
    const key = postDraftStorageKey(saved.userId, saved.editorKey);
    const raw = readRaw(key);
    const current = parsePostDraftRecovery(
      typeof raw === 'string' || raw === null ? raw : await raw,
      saved.userId,
      saved.editorKey,
    );
    if (current && JSON.stringify(current.content) === JSON.stringify(saved.content))
      await writeRaw(key, null);
  };
  const clearing = pendingWrite.then(clear);
  pendingWrite = clearing.catch(() => undefined);
  return clearing;
}

export function restorePostDraftVideo(saved: PostDraftRecovery): PickedVideo | null {
  // Blob URLs do not retain the browser File needed by readRange across app/page restarts.
  if (!saved.content.video || Platform.OS === 'web') return null;
  try {
    const file = new File(saved.content.video.uri);
    if (!file.exists || !file.size) return null;
    const mimeType = resolveVideoMimeType(saved.content.video.mimeType);
    return mimeType ? fileVideoSource({ ...saved.content.video, sizeBytes: file.size, mimeType }) : null;
  } catch {
    return null;
  }
}
