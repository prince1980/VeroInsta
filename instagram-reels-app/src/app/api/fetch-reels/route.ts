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
      flatPlaylist: true,
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

    // Using youtubedl-exec to fetch playlist/profile metadata
    const output = await youtubedl(url, ytDlpOptions);

    const payload = output as any;
    if (!payload) {
      throw new Error("Received empty or null response from Instagram.");
    }
    // Parse the entries. youtube-dl returns 'entries' for a playlist.
    const entries = payload.entries || [];
    
    // Sometimes Instagram returns raw entries directly, we map them to a clean format
    const reels = entries.map((entry: any, index: number) => ({
      id: entry.id || `reel-${index}`,
      title: entry.title || entry.description || 'Instagram Reel',
      url: entry.url || entry.webpage_url,
      thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url || '',
      duration: entry.duration,
      viewCount: entry.view_count
    })).filter((reel: any) => reel.url);

    if (reels.length === 0) {
      // If it failed to get entries, it might have just gotten a single video or failed due to auth
      if (payload.id && !payload.entries) {
        reels.push({
          id: payload.id,
          title: payload.title || 'Instagram Reel',
          url: payload.webpage_url || url,
          thumbnail: payload.thumbnail,
        });
      } else {
        return NextResponse.json({ 
          error: 'No reels found or rate-limited by Instagram. Please try again later or check the URL.' 
        }, { status: 404 });
      }
    }

    return NextResponse.json({ reels });
  } catch (error: any) {
    console.error('Error fetching reels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reels. Instagram might be blocking the request. ' + (error.message || '') },
      { status: 500 }
    );
  }
}
