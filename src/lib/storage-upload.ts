/**
 * Upload to Supabase Storage with real byte-level progress.
 * `fetch` cannot report upload progress, so this speaks the Storage REST protocol over XMLHttpRequest. The wire format
 * mirrors @supabase/storage-js (POST /object/{bucket}/{path}, multipart with cacheControl and the file), and the caller's
 * own access token is used, so storage RLS applies exactly as it does for supabase.storage.upload().
 */
export type UploadRequest = { url: string; headers: Record<string, string>; fields: [string, string][] };

/** Pure: everything about the request except the body bytes. Unit-tested. */
export function buildUploadRequest(o: { supabaseUrl: string; anonKey: string; accessToken: string; bucket: string; path: string; upsert?: boolean }): UploadRequest {
  const encoded = o.path.split("/").map(encodeURIComponent).join("/");
  return {
    url: `${o.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(o.bucket)}/${encoded}`,
    headers: { apikey: o.anonKey, Authorization: `Bearer ${o.accessToken}`, "x-upsert": String(!!o.upsert) },
    fields: [["cacheControl", "3600"]],
  };
}

/** Progress as a whole percentage, clamped; unknown totals report 0 rather than NaN. */
export function percent(loaded: number, total: number): number {
  if (!total || total < 0 || loaded < 0) return 0;
  return Math.min(100, Math.round((loaded / total) * 100));
}

export function uploadWithProgress(req: UploadRequest, blob: Blob, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", req.url);
    for (const [k, v] of Object.entries(req.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(percent(e.loaded, e.total)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); } else reject(new Error(`upload_failed_${xhr.status}`)); };
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.onabort = () => reject(new Error("aborted"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.timeout = 120_000;
    const body = new FormData();
    for (const [k, v] of req.fields) body.append(k, v);
    body.append("", blob);                                  // the Storage API expects the file under an empty field name
    xhr.send(body);
  });
}
