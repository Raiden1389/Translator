mod tts;
mod auth;

use std::env;
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

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
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
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
