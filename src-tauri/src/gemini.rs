use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};

const DEFAULT_VERTEX_LOCATION: &str = "asia-southeast1";
const GLOBAL_VERTEX_LOCATION: &str = "global";
const DEFAULT_VERTEX_PROJECT_ID: &str = "gen-lang-client-0688183488";

fn get_vertex_location_for_model(model: &str) -> &'static str {
    if model.trim().to_ascii_lowercase().starts_with("gemini-3") {
        GLOBAL_VERTEX_LOCATION
    } else {
        DEFAULT_VERTEX_LOCATION
    }
}

#[derive(Debug, Deserialize)]
struct ServiceAccountKey {
    project_id: Option<String>,
    client_email: String,
    private_key: String,
    token_uri: Option<String>,
}

#[derive(Debug, Serialize)]
struct ServiceAccountClaims {
    iss: String,
    scope: String,
    aud: String,
    exp: usize,
    iat: usize,
}

#[derive(Debug, Deserialize)]
struct ServiceAccountTokenResponse {
    access_token: String,
}

#[derive(Debug, Serialize)]
pub struct DetectedServiceAccountInfo {
    path: String,
    project_id: Option<String>,
    client_email: String,
}

fn load_service_account_key(path: &str) -> Result<ServiceAccountKey, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Không đọc được Service Account JSON: {}", e))?;
    serde_json::from_str::<ServiceAccountKey>(&raw).map_err(|e| format!("Service Account JSON không hợp lệ: {}", e))
}

fn collect_candidate_dirs() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(current_dir) = env::current_dir() {
        roots.push(current_dir);
    }

    if let Ok(current_exe) = env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            roots.push(exe_dir.to_path_buf());
            if let Some(parent) = exe_dir.parent() {
                roots.push(parent.to_path_buf());
            }
        }
    }

    roots
}

fn looks_like_service_account_json(path: &Path) -> Option<DetectedServiceAccountInfo> {
    let path_str = path.to_string_lossy().to_string();
    let key = load_service_account_key(&path_str).ok()?;

    Some(DetectedServiceAccountInfo {
        path: path_str,
        project_id: key.project_id.or_else(|| Some(DEFAULT_VERTEX_PROJECT_ID.to_string())),
        client_email: key.client_email,
    })
}

fn scan_for_service_account_json(root: &Path, depth: usize) -> Option<DetectedServiceAccountInfo> {
    if depth > 4 {
        return None;
    }

    let entries = fs::read_dir(root).ok()?;
    let mut json_candidates = Vec::new();
    let mut nested_dirs = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
            if matches!(name, "node_modules" | "src-tauri" | "target" | ".git" | ".next" | "dist" | "build") {
                continue;
            }
            nested_dirs.push(path);
            continue;
        }

        if path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("json"))
            .unwrap_or(false)
        {
            json_candidates.push(path);
        }
    }

    json_candidates.sort_by_key(|path| {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();

        if name.starts_with("gen-lang-client-") {
            0
        } else if name.contains("service") || name.contains("vertex") || name.contains("gcp") {
            1
        } else {
            2
        }
    });

    for candidate in json_candidates {
        if let Some(info) = looks_like_service_account_json(&candidate) {
            return Some(info);
        }
    }

    for dir in nested_dirs {
        if let Some(info) = scan_for_service_account_json(&dir, depth + 1) {
            return Some(info);
        }
    }

    None
}

async fn get_service_account_access_token(service_account_path: &str) -> Result<(String, Option<String>), String> {
    let service_account = load_service_account_key(service_account_path)?;
    let token_uri = service_account
        .token_uri
        .clone()
        .unwrap_or_else(|| "https://oauth2.googleapis.com/token".to_string());

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as usize;

    let claims = ServiceAccountClaims {
        iss: service_account.client_email.clone(),
        scope: "https://www.googleapis.com/auth/cloud-platform".to_string(),
        aud: token_uri.clone(),
        iat: now,
        exp: now + 3600,
    };

    let assertion = jsonwebtoken::encode(
        &Header::new(Algorithm::RS256),
        &claims,
        &EncodingKey::from_rsa_pem(service_account.private_key.as_bytes())
            .map_err(|e| format!("Private key RSA không hợp lệ: {}", e))?,
    )
    .map_err(|e| format!("Không tạo được JWT cho Service Account: {}", e))?;

    let body = format!(
        "grant_type={}&assertion={}",
        urlencoding::encode("urn:ietf:params:oauth:grant-type:jwt-bearer"),
        urlencoding::encode(&assertion)
    );

    let client = reqwest::Client::new();
    let res = client
        .post(&token_uri)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Không gọi được token endpoint: {}", e))?;

    let status = res.status();
    let raw_body = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("TOKEN_HTTP_ERROR:{}:{}", status.as_u16(), raw_body));
    }

    let token = serde_json::from_str::<ServiceAccountTokenResponse>(&raw_body)
        .map_err(|e| format!("Token response không parse được: {} | body: {}", e, raw_body))?;

    Ok((
        token.access_token,
        service_account
            .project_id
            .or_else(|| Some(DEFAULT_VERTEX_PROJECT_ID.to_string())),
    ))
}

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
    location: Option<String>,
    api_key: String,
) -> Result<String, String> {
    let resolved_location = location.unwrap_or_else(|| get_vertex_location_for_model(&model).to_string());
    let url = format!(
        "https://{}-aiplatform.googleapis.com/v1/publishers/google/models/{}:generateContent?key={}",
        resolved_location, model, api_key
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
pub async fn native_vertex_service_account_request(
    payload: String,
    model: String,
    location: Option<String>,
    service_account_path: String,
    project_id: Option<String>,
) -> Result<String, String> {
    let resolved_location = location.unwrap_or_else(|| get_vertex_location_for_model(&model).to_string());
    let (access_token, project_from_key) = get_service_account_access_token(&service_account_path).await?;
    let resolved_project = project_id
        .filter(|p| !p.trim().is_empty())
        .or(project_from_key)
        .or_else(|| Some(DEFAULT_VERTEX_PROJECT_ID.to_string()))
        .ok_or_else(|| "Không tìm thấy project_id hợp lệ cho Vertex Service Account".to_string())?;

    let url = format!(
        "https://aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/{}:generateContent",
        resolved_project,
        resolved_location,
        model
    );

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", access_token))
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
pub async fn native_list_vertex_models_service_account(
    service_account_path: String,
    project_id: Option<String>,
    location: Option<String>,
) -> Result<String, String> {
    let resolved_location = location.unwrap_or_else(|| DEFAULT_VERTEX_LOCATION.to_string());
    let (access_token, project_from_key) = get_service_account_access_token(&service_account_path).await?;
    let resolved_project = project_id
        .filter(|p| !p.trim().is_empty())
        .or(project_from_key)
        .or_else(|| Some(DEFAULT_VERTEX_PROJECT_ID.to_string()))
        .ok_or_else(|| "Không tìm thấy project_id hợp lệ cho Vertex Service Account".to_string())?;

    let url = format!(
        "https://aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models",
        resolved_project,
        resolved_location
    );

    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .header("Authorization", format!("Bearer {}", access_token))
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
pub fn native_detect_vertex_service_account() -> Result<Option<DetectedServiceAccountInfo>, String> {
    for root in collect_candidate_dirs() {
        if let Some(info) = scan_for_service_account_json(&root, 0) {
            return Ok(Some(info));
        }
    }

    Ok(None)
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
