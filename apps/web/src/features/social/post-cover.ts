const DESTINATION_COVERS = new Map([
  ['nha trang', '/brand/sea.jpg'],
  ['hội an', '/brand/hoian.jpg'],
  ['đà nẵng', '/brand/home-shore.jpg'],
]);

export const POST_COVER_MASCOT = '/brand/tripi-curious.png';

export function getPostCover(destinationName?: string) {
  return DESTINATION_COVERS.get(destinationName?.trim().toLowerCase() ?? '');
}
