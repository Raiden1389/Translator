use std::process::Command;
use tauri::command;
use uuid::Uuid;

#[command]
async fn generate_speech(text: String, voice: String, rate: String) -> Result<Vec<u8>, String> {
    // Create temp file path
    let temp_dir = std::env::temp_dir();
    let output_file = temp_dir.join(format!("tts_{}.mp3", Uuid::new_v4()));

    // Run edge-tts command
    let output = Command::new("edge-tts")
        .arg("--voice")
        .arg(&voice)
        .arg("--rate")
        .arg(&rate)
        .arg("--text")
        .arg(&text)
        .arg("--write-media")
        .arg(&output_file)
        .output()
        .map_err(|e| format!("Failed to run edge-tts: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "edge-tts failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Read the generated audio file
    let audio_data =
        std::fs::read(&output_file).map_err(|e| format!("Failed to read audio file: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&output_file);

    Ok(audio_data)
}

mod tts;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![tts::edge_tts_speak])
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
