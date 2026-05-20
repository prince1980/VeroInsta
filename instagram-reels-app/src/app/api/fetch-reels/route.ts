import { NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes('instagram.com')) {
      return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });
    }

    // Using youtube-dl-exec to fetch playlist/profile metadata
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:instagram.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    // Parse the entries. youtube-dl returns 'entries' for a playlist.
    const entries = output.entries || [];
    
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
      if (output.id && !output.entries) {
        reels.push({
          id: output.id,
          title: output.title || 'Instagram Reel',
          url: output.webpage_url || url,
          thumbnail: output.thumbnail,
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
