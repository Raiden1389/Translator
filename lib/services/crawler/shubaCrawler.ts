import { fetch } from '@tauri-apps/plugin-http';
import { UniversalEngine } from './engines/universalEngine';

export interface CrawlerChapter {
    title: string;
    url: string;
}

export interface CrawlerBookInfo {
    title: string;
    author: string;
    cover: string;
    description: string;
    chapters: CrawlerChapter[];
}

// --- 69shuba Crawler (Now powered by UniversalEngine) ---

export async function fetchShubaTOC(bookUrl: string, isManual = false): Promise<CrawlerBookInfo> {
    return UniversalEngine.fetchTOC(bookUrl, isManual);
}

export async function fetchShubaChapter(chapterUrl: string, isManual = false): Promise<{ title: string; content: string }> {
    return UniversalEngine.fetchChapter(chapterUrl, isManual);
}

// --- Fanqie Crawler ---

const FANQIE_CHARSET = ['体', 'y', '十', '现', '快', '便', '话', '却', '月', '物', '水', '的', '放', '知', '愛', '万', '', '表', '风', '理', 'O', '老', '也', 'p', '常', '克', '平', '几', '最', '主', '彼女', 's', '将', '法', '情', 'o', '光', 'a', '我', '呢', 'J', '員', '太', '每', '望', '受', '教', 'w', '利', '軍', '已', 'U', '人', '如', '变', '得', '要', '少', '斯', '门', '电', 'm', '男', '没', 'A', 'K', '国', '时', '中', '走', '么', '何', '口', '小', '向', '问', '轻', 'T', 'd', '神', '下', '间', '车', 'f', 'G', '度', 'D', '又', '大', '面', '远', '就', '写', 'j', '给', '通', '起', '实', 'E', '', '它', '去', 'S', '到', '道', '数', '吃', '们', '加', 'P', '是', '无', '把', '事', '西', '多', '界', '', '发', '新', '外', '活', '解', '孩', '只', '作', '前', 'Y', '尔', '经', '', 'u', '心', '告', '父', '等', 'Q', '民', '全', '这', '9', '果', '安', '', 'i', '母', '8', 'r', '说', '任', '先', '和', '地', 'C', '张', '战', '场', 'g', '像', 'c', 'q', '你', '使', '', '样', '总', '目', 'x', '性', '处', '音', '头', '', '应', '乐', '关', '能', '花', 'l', '当', '名', '手', '4', '重', '字', '声', '力', '友', '然', '生', '代', '内', '里', '本', '回', '真', '入', '师', '象', '', '0', '点', 'R', '親', 'V', '种', '动', '英', '命', 'Z', 'h', 'X', '做', '特', '边', '高', '有', 'B', '为', '期', '自', '年', '马', '认', '出', '接', '至', 'H', '正', '方', '感', '所', '明', '者', '稜', 'F', '住', '学', '还', '分', '意', '更', '其', 'n', '但', '比', '觉', '以', '由', '死', '家', '让', '失', '士', 'L', '2', 'I', '金', '叫', '身', '報', '听', 'W', '再', '原', '산', '해', '백', '흔', '견', '5', '직', '위', '제', '공', '개', '개', '세', '호', '용', '도', '어', '가', '동', '3', '차', '사', '', '일', '신', '여', '녀', '소', '万', '병', '부', '십', '부', '종', '혹', '기', '차', '', '료', '기', '삼', 'e', '사', 'b', 'N', '夫', '会', '才', '儿', '眼', '两', '美', '被', '一', '公', '来', '立', 'z', '长', '对', '己', '看', 'k', '许', '因', '相', '色', '后', '往', '打', '结', '格', '过', '世', '气', '7', '子', '条', '在', '书', '之', '定', 'v', '拉', '成', '进', '带', '着', '东', '上', '想', '天', '他', '妈', '1', '文', ' mà', '路', '那', '别', '德', '6', 'M', 't', '行', '候', '难'];
const CODE_ST = 58344;
const CODE_ED = 58715;

function decodeFanqieText(text: string): string {
    if (!text) return "";
    let decoded = '';
    for (let i = 0; i < text.length; i++) {
        const cc = text.charCodeAt(i);
        if (cc >= CODE_ST && cc <= CODE_ED) {
            const bias = cc - CODE_ST;
            const mapped = FANQIE_CHARSET[bias];
            decoded += (mapped || text.charAt(i));
        } else {
            decoded += text.charAt(i);
        }
    }
    return decoded;
}

export async function fetchFanqieTOC(url: string): Promise<CrawlerBookInfo> {
    const bookIdMatch = url.match(/(?:book_id=|\/)(\d+)/);
    if (!bookIdMatch) throw new Error("Invalid Fanqie URL");
    const bookId = bookIdMatch[1];

    const detailUrl = `https://api5-normal-sinfonlineb.fqnovel.com/reading/bookapi/multi-detail/v/?aid=2329&iid=1&version_code=999&book_id=${bookId}`;

    const response = await fetch(detailUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
    });

    if (!response.ok) throw new Error(`Fanqie API Error: ${response.status}`);

    const json = await response.json() as { data: Array<{ book_name: string, author: string, thumb_url: string, abstract: string }> };
    const bookInfo = json.data[0];

    const tocUrl = `https://api5-normal-sinfonlineb.fqnovel.com/reading/bookapi/directory/all_items/v/?aid=2329&book_id=${bookId}`;
    const tocResponse = await fetch(tocUrl);
    const tocJson = await tocResponse.json() as { data: { item_list: Array<{ title: string, item_id: string }> } };

    const chapters: CrawlerChapter[] = (tocJson.data.item_list || []).map((item) => ({
        title: decodeFanqieText(item.title),
        url: `https://fanqienovel.com/reader/${item.item_id}`
    }));

    return {
        title: decodeFanqieText(bookInfo.book_name),
        author: decodeFanqieText(bookInfo.author),
        cover: bookInfo.thumb_url,
        description: decodeFanqieText(bookInfo.abstract),
        chapters
    };
}

export async function fetchFanqieChapter(chapterUrl: string): Promise<{ title: string; content: string }> {
    const itemIdMatch = chapterUrl.match(/(?:item_id=|\/)(\d+)$/);
    if (!itemIdMatch) throw new Error("Invalid Fanqie Chapter URL");
    const itemId = itemIdMatch[1];

    const contentUrl = `https://api5-normal-sinfonlineb.fqnovel.com/reading/bookapi/batch_full/v/?aid=2329&item_ids=${itemId}`;

    const response = await fetch(contentUrl);
    if (!response.ok) throw new Error(`Fanqie Content Error: ${response.status}`);

    const json = await response.json() as { data: Array<{ title: string, content: string }> };
    const data = json.data[0];

    const decodedTitle = decodeFanqieText(data.title);
    let content = decodeFanqieText(data.content);

    // Better cleaning for Fanqie content to avoid "eating" inline tags
    content = content
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<h1[\s\S]*?<\/h1>/gi, "")
        .replace(/<\/p>|<br\s*\/?>/gi, "\n") // Only convert block ends to newlines
        .replace(/<[^>]+>/g, "")             // Strip remaining inline tags
        .replace(/\n{2,}/g, "\n\n")
        .trim();

    return {
        title: decodedTitle,
        content
    };
}
