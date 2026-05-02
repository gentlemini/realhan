export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: '파일 없음' }, { status: 400 });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName) return Response.json({ error: 'Cloudinary 미설정' }, { status: 500 });

    const fd = new FormData();
    fd.append('file', file);

    if (apiKey && apiSecret) {
      // Signed upload (works with any preset mode)
      const { createHash } = await import('crypto');
      const timestamp = Math.round(Date.now() / 1000);
      const signature = createHash('sha1')
        .update(`timestamp=${timestamp}${apiSecret}`)
        .digest('hex');
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
    } else if (preset) {
      // Unsigned upload (requires unsigned preset in Cloudinary dashboard)
      fd.append('upload_preset', preset);
    } else {
      return Response.json({ error: '업로드 프리셋 미설정' }, { status: 500 });
    }

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      const msg = data?.error?.message || `Cloudinary ${res.status}`;
      return Response.json({ error: msg }, { status: 500 });
    }

    return Response.json({ secure_url: data.secure_url });
  } catch (err) {
    return Response.json({ error: err.message || '업로드 실패' }, { status: 500 });
  }
}
