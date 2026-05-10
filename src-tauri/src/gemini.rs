use std::env;

const DEFAULT_VERTEX_LOCATION: &str = "asia-southeast1";

#[tauri::command]
pub async fn native_gemini_request(
    payload: String,
    model: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let actual_key = resolve_api_key(api_key)?;
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, actual_key
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn native_vertex_request(
    payload: String,
    model: String,
    api_key: String,
) -> Result<String, String> {
    let url = format!(
        "https://{}-aiplatform.googleapis.com/v1/publishers/google/models/{}:generateContent?key={}",
        DEFAULT_VERTEX_LOCATION, model, api_key
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("HTTP_ERROR:{}:{}", status.as_u16(), body));
    }

    Ok(body)
}

#[tauri::command]
pub async fn native_gemini_oauth_request(
    payload: String,
    model: String,
    access_token: String,
) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        // Surface HTTP error code so the TS layer can detect 429, 401, etc.
        return Err(format!("HTTP_ERROR:{}:{}", status.as_u16(), body));
    }

    Ok(body)
}

#[tauri::command]
pub async fn native_list_models(api_key: String) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );

    let client = reqwest::Client::new();
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    res.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn native_list_vertex_models(api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let urls = [
        format!(
            "https://{}-aiplatform.googleapis.com/v1beta1/publishers/google/models?key={}",
            DEFAULT_VERTEX_LOCATION,
            api_key
        ),
    ];

    let mut last_error: Option<String> = None;

    for url in urls {
        let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
        let status = res.status();
        let body = res.text().await.map_err(|e| e.to_string())?;

        if status.is_success() {
            return Ok(body);
        }

        last_error = Some(format!("HTTP_ERROR:{}:{}", status.as_u16(), body));
    }

    Err(last_error.unwrap_or_else(|| "Không thể lấy danh sách Vertex models".to_string()))
}

#[tauri::command]
pub async fn native_gemini_create_cache(
    payload: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let actual_key = resolve_api_key(api_key)?;
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/cachedContents?key={}",
        actual_key
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .body(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn native_gemini_delete_cache(
    cache_name: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let actual_key = resolve_api_key(api_key)?;
    // cache_name is expected to be "cachedContents/id"
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/{}?key={}",
        cache_name, actual_key
    );

    let client = reqwest::Client::new();
    let res = client
        .delete(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_gemini_key() -> Result<String, String> {
    dotenvy::dotenv().ok();
    env::var("GEMINI_API_KEY").map_err(|_| "Không tìm thấy GEMINI_API_KEY trong .env".to_string())
}

/// Resolve API key from parameter or .env file
fn resolve_api_key(api_key: Option<String>) -> Result<String, String> {
    match api_key {
        Some(k) if !k.is_empty() => Ok(k),
        _ => {
            dotenvy::dotenv().ok();
            env::var("GEMINI_API_KEY").map_err(|_| "Missing API Key".to_string())
        }
    }
}
