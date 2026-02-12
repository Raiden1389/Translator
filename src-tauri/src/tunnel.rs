use std::sync::Mutex;
use once_cell::sync::Lazy;

static TUNNEL_PROCESS: Lazy<Mutex<Option<std::process::Child>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub async fn start_tunnel(_port: u16) -> Result<String, String> {
    // Kill any existing tunnel
    stop_tunnel().ok();

    let cloudflared_path = r"C:\Program Files (x86)\cloudflared\cloudflared.exe";
    if !std::path::Path::new(cloudflared_path).exists() {
        return Err("cloudflared chưa được cài. Chạy: winget install Cloudflare.cloudflared".to_string());
    }

    #[cfg(target_os = "windows")]
    let mut cmd = {
        use std::os::windows::process::CommandExt;
        let mut c = std::process::Command::new(cloudflared_path);
        c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        c
    };
    #[cfg(not(target_os = "windows"))]
    let mut cmd = std::process::Command::new(cloudflared_path);

    let child = cmd
        .args(&["tunnel", "run", "raiden-reader"])
        .stderr(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Không thể khởi động cloudflared: {}", e))?;

    // Named tunnel — URL is fixed, no need to parse output
    *TUNNEL_PROCESS.lock().unwrap() = Some(child);

    // Small delay to let tunnel establish connection
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    Ok("https://raidenhub.xyz".to_string())
}

#[tauri::command]
pub fn stop_tunnel() -> Result<(), String> {
    let mut guard = TUNNEL_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *guard {
        let _ = child.kill();
        let _ = child.wait();
    }
    *guard = None;
    Ok(())
}
