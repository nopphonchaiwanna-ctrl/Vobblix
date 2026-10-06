// Shared "pick an image file from disk, resize/re-encode it entirely
// client-side via <canvas>, hand back a small data: URL" helper. Used
// anywhere a photo is uploaded without a real file-storage backend
// (profile avatar - see settings.js; shop logo - see ownerDashboard.js):
// the result gets saved straight into a plain *_url column, so no
// upload endpoint or object storage is needed, and keeping the result
// small matters for the DB column and the request body.
export function fileToResizedDataUrl(file, { maxDimension, maxSourceBytes, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (maxSourceBytes && file.size > maxSourceBytes) {
      reject(new Error(`That image is too large (max ${Math.round(maxSourceBytes / (1024 * 1024))}MB).`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
