import { NextResponse } from 'next/server';
import youtubedl from '@/lib/youtubedl';

export async function POST(request: Request) {
  try {
    const { url, sessionId } = await request.json();

    if (!url || !url.includes('instagram.com')) {
      return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });
    }

    const ytDlpOptions: any = {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:instagram.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ]
    };

    if (sessionId) {
      ytDlpOptions.addHeader.push(`Cookie:sessionid=${sessionId}`);
    }

    const output = await youtubedl(url, ytDlpOptions);

    // Find the best mp4 URL
    const payload = output as any;
    if (!payload) {
        throw new Error("Received empty or null response from Instagram.");
    }
    const format = payload.formats?.find((f: any) => f.ext === 'mp4' && f.vcodec !== 'none') || 
                   payload.formats?.find((f: any) => f.ext === 'mp4') || 
                   payload;

    const downloadUrl = format.url;

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Could not find a downloadable video URL' }, { status: 404 });
    }

    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error('Error getting download URL:', error);
    return NextResponse.json(
      { error: 'Failed to get download URL. ' + (error.message || '') },
      { status: 500 }
    );
  }
}
