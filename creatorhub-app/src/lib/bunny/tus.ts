/**
 * Browser-side helper for resumable Bunny.net Stream uploads via TUS.
 *
 * The server creates a video shell (`POST /api/clients/[slug]/assets/videos`)
 * and returns the TUS upload params. The browser then drives the upload
 * directly to Bunny's TUS endpoint — bytes never round-trip through our
 * Next.js server.
 *
 * `tus-js-client` is not installed yet (see Phase 5 NOTES → "Dependencies");
 * we import it dynamically so the build keeps compiling until `npm i` runs.
 */

export type BunnyTusParams = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
};

export type UploadCallbacks = {
  onProgress: (loaded: number, total: number) => void;
  onSuccess: () => void;
  onError: (err: Error) => void;
};

export async function startBunnyTusUpload(
  file: File,
  params: BunnyTusParams,
  callbacks: UploadCallbacks,
): Promise<{ abort: () => void }> {
  let tus: typeof import("tus-js-client");
  try {
    tus = await import("tus-js-client");
  } catch {
    const err = new Error(
      "tus-js-client is not installed. Run `npm i tus-js-client` from creatorhub-app/.",
    );
    callbacks.onError(err);
    throw err;
  }

  const upload = new tus.Upload(file, {
    endpoint: params.endpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: 8 * 1024 * 1024,
    headers: {
      AuthorizationSignature: params.authorizationSignature,
      AuthorizationExpire: String(params.authorizationExpire),
      VideoId: params.videoId,
      LibraryId: params.libraryId,
    },
    metadata: { filename: file.name, filetype: file.type },
    onError: (err: Error) => callbacks.onError(err),
    onProgress: (loaded: number, total: number) =>
      callbacks.onProgress(loaded, total),
    onSuccess: () => callbacks.onSuccess(),
  });

  upload.start();
  return { abort: () => upload.abort() };
}
