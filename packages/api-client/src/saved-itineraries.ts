import * as itineraries from './generated/core-api/content-saved-itineraries/content-saved-itineraries';
import type {
  SavedItineraryDto,
  SaveItineraryRequestDto,
  UpdateItineraryRequestDto,
} from './generated/core-api/model';

/** Lộ trình đã lưu của tôi (TF105): bản sao theo Ngày 1..N từ reel, Tripi hoặc màn tự lên lộ trình. */
export const itineraryApi = {
  async list(postId?: string, signal?: AbortSignal): Promise<SavedItineraryDto[]> {
    return (await itineraries.savedItinerariesControllerList(postId ? { postId } : undefined, { signal }))
      .data.itineraries;
  },
  async get(id: string, signal?: AbortSignal): Promise<SavedItineraryDto> {
    return (await itineraries.savedItinerariesControllerGet(id, { signal })).data;
  },
  async save(request: SaveItineraryRequestDto): Promise<SavedItineraryDto> {
    return (await itineraries.savedItinerariesControllerSave(request)).data;
  },
  async update(id: string, changes: UpdateItineraryRequestDto): Promise<SavedItineraryDto> {
    return (await itineraries.savedItinerariesControllerUpdate(id, changes)).data;
  },
  async remove(id: string): Promise<void> {
    await itineraries.savedItinerariesControllerRemove(id);
  },
};

export const SAVED_ITINERARIES_QUERY_KEY = ['content', 'saved-itineraries'] as const;
