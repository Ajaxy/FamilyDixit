export const CLIPBOARD_ITEM_SUPPORTED = navigator.clipboard && window.ClipboardItem;

const IMG_WIDTH = 569;
const IMG_HEIGHT = 820;
const IMG_MARGIN = 20;
const COLUMNS_COUNT = 3;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject('Failed to convert to PNG');
      }
    }, 'image/png', 1);
  });
}

export async function drawTiles(imageUrls: string[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const columnsCount = Math.min(imageUrls.length, COLUMNS_COUNT);
  const rowsCount = Math.ceil(imageUrls.length / 3);

  canvas.width = columnsCount * IMG_WIDTH + IMG_MARGIN * (columnsCount - 1);
  canvas.height = rowsCount * IMG_HEIGHT + IMG_MARGIN * (rowsCount - 1);

  let i = 0;
  for (let j = 0; j < rowsCount; j++) {
    for (let k = 0; k < columnsCount; k++, i++) {
      const img = await loadImage(imageUrls[i]);
      ctx.drawImage(
        img,
        k * (IMG_WIDTH + IMG_MARGIN),
        j * (IMG_HEIGHT + IMG_MARGIN),
        IMG_WIDTH,
        IMG_HEIGHT,
      );
    }
  }

  return canvasToPng(canvas);
}

export async function copyBlobToClipboard(pngBlob: Blob) {
  try {
    await navigator.clipboard.write([
      new window.ClipboardItem({
        [pngBlob.type]: pngBlob,
      }),
    ]);
  } catch (error) {
    console.error(error);
  }
}
