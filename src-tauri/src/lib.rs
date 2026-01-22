mod tts;
mod auth;

#[tauri::command]
fn get_gemini_key() -> Result<String, String> {
    dotenvy::dotenv().ok(); // Read .env file
    std::env::var("GEMINI_API_KEY").map_err(|_| "Không tìm thấy Key trong .env mày ơi".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tts::edge_tts_speak,
            auth::start_auth_server,
            get_gemini_key
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
