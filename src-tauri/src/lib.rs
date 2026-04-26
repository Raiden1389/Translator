mod tts;
mod auth;
mod sync_server;
mod gemini;
mod storage;
mod tunnel;

#[tauri::command]
async fn start_sync_server(sync_data: String) -> Result<serde_json::Value, String> {
    sync_server::SyncServer::start(8888, sync_data)
}

#[tauri::command]
fn stop_sync_server() -> Result<(), String> {
    sync_server::SyncServer::stop();
    Ok(())
}

#[tauri::command]
fn poll_mobile_corrections() -> Vec<serde_json::Value> {
    sync_server::SyncServer::take_corrections()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Gemini API
            gemini::native_gemini_request,
            gemini::native_gemini_oauth_request,
            gemini::native_gemini_create_cache,
            gemini::native_gemini_delete_cache,
            gemini::native_list_models,
            gemini::get_gemini_key,
            // TTS & Auth
            tts::edge_tts_speak,
            auth::start_auth_server,
            auth::exchange_code_native,
            auth::refresh_token_native,
            // Storage
            storage::open_folder,
            storage::create_storage_symlink,
            // Sync
            start_sync_server,
            stop_sync_server,
            poll_mobile_corrections,
            // Tunnel
            tunnel::start_tunnel,
            tunnel::stop_tunnel,
        ])

        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
