use std::process::Command;
use tauri::command;
use uuid::Uuid;

#[command]
pub async fn edge_tts_speak(text: String, voice: String) -> Result<Vec<u8>, String> {
    // Create temp file path
    let temp_dir = std::env::temp_dir();
    let filename = format!("tts_{}.mp3", Uuid::new_v4());
    let output_path = temp_dir.join(&filename);

    // Run edge-tts command
    let output = Command::new("edge-tts")
        .arg("--voice")
        .arg(&voice)
        .arg("--text")
        .arg(&text)
        .arg("--write-media")
        .arg(&output_path)
        .output()
        .map_err(|e| format!("Failed to run edge-tts: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "edge-tts failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Read the file content
    let audio_data =
        std::fs::read(&output_path).map_err(|e| format!("Failed to read audio file: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&output_path);

    Ok(audio_data)
}
