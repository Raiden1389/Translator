import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const referer = getReferer(url);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': referer,
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
            'Upgrade-Insecure-Requests': '1'
        };

        console.log(`[Crawler] Fetching: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            // @ts-ignore

            next: { revalidate: 0 } // No cache
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || '';

        // Detect charset
        let charset = 'utf-8';
        const headerCharset = contentType.match(/charset=([^;]+)/i);
        if (headerCharset) {
            charset = headerCharset[1].toLowerCase().trim();
        } else {
            // Peek at HTML meta tags
            const partial = new TextDecoder('ascii', { fatal: false }).decode(buffer.slice(0, 1000));
            const metaCharset = partial.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i);
            if (metaCharset) {
                charset = metaCharset[1].toLowerCase().trim();
            }
        }

        if (charset === 'gb2312' || charset === 'gb18030') charset = 'gbk';

        console.log(`[Crawler] Detected charset: ${charset}`);

        const decoder = new TextDecoder(charset);
        const html = decoder.decode(buffer);

        return NextResponse.json({
            url,
            title: extractTitle(html), // Basic extraction, frontend can do more
            content: html
        });

    } catch (error: any) {
        console.error('[Crawler] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getReferer(urlStr: string): string {
    try {
        const url = new URL(urlStr);
        // 69shuba specific logic
        if (url.hostname.includes('69shuba.com') && url.pathname.startsWith('/txt/')) {
            const match = url.pathname.match(/^\/txt\/(\d+)\//);
            if (match) return `${url.origin}/book/${match[1]}/`;
        }
        return url.origin + '/';
    } catch {
        return 'https://www.google.com/';
    }
}

function extractTitle(html: string) {
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : 'Unknown Title';
}
