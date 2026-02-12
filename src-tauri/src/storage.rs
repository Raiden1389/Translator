use std::path::Path;
use std::fs;
use tauri::Manager;

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
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

#[tauri::command]
pub async fn create_storage_symlink(
    new_path: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use std::path::PathBuf;

    // 1. Get current AppData path
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let _current_path = app_data_dir.to_str().ok_or("Invalid path")?.to_string();
    let new_target = PathBuf::from(&new_path);

    // 2. Validate new path
    if !new_target.exists() {
        fs::create_dir_all(&new_target).map_err(|e| format!("Cannot create directory: {}", e))?;
    }

    // 3. Check if current path has data
    let has_data = app_data_dir.exists()
        && app_data_dir
            .read_dir()
            .map(|mut d: std::fs::ReadDir| d.next().is_some())
            .unwrap_or(false);

    // 4. Copy data if exists
    if has_data {
        copy_dir_recursive(&app_data_dir, &new_target)
            .map_err(|e| format!("Failed to copy data: {}", e))?;
    }

    // 5. Remove old directory
    if app_data_dir.exists() {
        fs::remove_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to remove old directory: {}", e))?;
    }

    // 6. Create symlink
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::symlink_dir;
        symlink_dir(&new_target, &app_data_dir)
            .map_err(|e| format!("Failed to create symlink: {}. Try running as Administrator.", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::symlink;
        symlink(&new_target, &app_data_dir)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;
    }

    Ok(format!("Storage moved to: {}", new_path))
}

/// Copy directory contents recursively
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}
