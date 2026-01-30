mod tts;
mod auth;

use std::env;
use std::fs;
use jieba_rs::Jieba;
use once_cell::sync::Lazy;
use serde::Serialize;

static JIEBA: Lazy<Jieba> = Lazy::new(|| Jieba::new());

#[derive(Serialize)]
struct SegmentResult {
    word: String,
    tag: String,
}

#[tauri::command]
fn segment_chinese(text: String) -> Vec<SegmentResult> {
    let tags = JIEBA.tag(&text, true);
    tags.into_iter()
        .map(|t| SegmentResult {
            word: t.word.to_string(),
            tag: t.tag.to_string(),
        })
        .collect()
}

#[tauri::command]
async fn native_gemini_request(
    payload: String,
    model: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let actual_key = match api_key {
        Some(k) if !k.is_empty() => k,
        _ => {
            dotenvy::dotenv().ok();
            std::env::var("GEMINI_API_KEY").map_err(|_| "Missing API Key".to_string())?
        }
    };

    let api_version = "v1beta";
    let url = format!(
        "https://generativelanguage.googleapis.com/{}/models/{}:generateContent?key={}",
        api_version, model, actual_key
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn native_list_models(api_key: String) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );

    let client = reqwest::Client::new();
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
fn get_gemini_key() -> Result<String, String> {
    dotenvy::dotenv().ok();
    env::var("GEMINI_API_KEY").map_err(|_| "Không tìm thấy GEMINI_API_KEY trong .env".to_string())
}

// Simple approach: Just fetch HTML directly from Rust
#[tauri::command]
async fn native_crawl_v2(
    _app: tauri::AppHandle,
    url: String,
    extraction_script: Option<String>,
    _timeout_ms: u64,
) -> Result<String, String> {
    println!("[Rust] Fetching URL directly: {}", url);
    
    // Fetch the page HTML using reqwest with browser-like headers
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;
    
    let html = client
        .get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("DNT", "1")
        .header("Connection", "keep-alive")
        .header("Upgrade-Insecure-Requests", "1")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    println!("[Rust] Fetched {} bytes of HTML", html.len());
    
    // Debug: Save HTML to file
    let debug_path = env::temp_dir().join("crawler_debug.html");
    if let Err(e) = fs::write(&debug_path, &html) {
        println!("[Rust] Failed to save debug HTML: {}", e);
    } else {
        println!("[Rust] Saved HTML to: {}", debug_path.display());
    }
    
    // Return HTML - TypeScript will parse it
    Ok(html)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tts::edge_tts_speak,
            auth::start_auth_server,
            native_gemini_request,
            native_list_models,
            segment_chinese,
            get_gemini_key,
            native_crawl_v2
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
