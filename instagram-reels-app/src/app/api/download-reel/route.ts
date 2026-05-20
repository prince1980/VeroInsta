import { NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes('instagram.com')) {
      return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });
    }

    // Fetch the direct video URL for a single reel
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      addHeader: [
        'referer:instagram.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    // Find the best mp4 URL
    const format = output.formats?.find((f: any) => f.ext === 'mp4' && f.vcodec !== 'none') || 
                   output.formats?.find((f: any) => f.ext === 'mp4') || 
                   output;

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
