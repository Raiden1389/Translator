export interface CrawlerRule {
    site: string;
    patterns: string[]; // To match URLs
    strategy: 'webview' | 'api';
    selectors: {
        toc: {
            title: string;
            author: string;
            cover: string;
            description: string;
            chapterLink: string;
            chapterList: string;
        };
        chapter: {
            title: string;
            content: string;
            remove: string[];
        };
    };
}

export const CRAWLER_RULES: CrawlerRule[] = [
    {
        site: '69shuba',
        patterns: ['69shuba.com', '69xinshu.com', '69shuba.pro', '69shuba.cx', '69shuba.me'],
        strategy: 'webview',
        selectors: {
            toc: {
                title: '.bookinfo h1',
                author: '.bookinfo .author a, .bookinfo .author',
                cover: '.bookops img',
                description: '.navtxt',
                chapterLink: '.catalog ul li a, #catalog ul li a', // More specific
                chapterList: '#list, #catalog, .catalog'       // Handle multiple TOC types
            },
            chapter: {
                title: '.txtnav h1',
                content: '.txtnav',
                remove: ['h1', '.comment', '.v_ads', '.item-title']
            }
        }
    }
    // Note: Fanqie is API-based and highly specialized, 
    // it will be handled by a dedicated engine for now.
];
