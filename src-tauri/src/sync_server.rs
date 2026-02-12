use std::sync::{Arc, Mutex};
use std::thread;

use tiny_http::{Server, Response, Header, Method};
use serde_json::json;
use std::time::{Duration, Instant};
use std::path::PathBuf;

static SERVER_RUNNING: Mutex<Option<Arc<Mutex<bool>>>> = Mutex::new(None);

/// In-memory sync data loaded from Desktop's Dexie IndexedDB
static SYNC_DATA: Mutex<Option<serde_json::Value>> = Mutex::new(None);

/// Incoming corrections from mobile (accumulated until frontend polls)
static INCOMING_CORRECTIONS: Mutex<Vec<serde_json::Value>> = Mutex::new(Vec::new());

/// Path to mobile-dist directory for serving static files
static MOBILE_DIST_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

pub struct SyncServer;

impl SyncServer {
    pub fn start(port: u16, sync_data: String) -> Result<serde_json::Value, String> {
        // Stop any existing server first
        Self::stop();

        // Wait for the old server thread to release the port
        thread::sleep(Duration::from_millis(500));

        // Parse & store sync data in memory
        let parsed: serde_json::Value = serde_json::from_str(&sync_data)
            .map_err(|e| format!("Failed to parse sync data: {}", e))?;
        {
            let mut data = SYNC_DATA.lock().unwrap();
            *data = Some(parsed);
        }

        // Clear any old corrections
        {
            let mut corrections = INCOMING_CORRECTIONS.lock().unwrap();
            corrections.clear();
        }

        // Resolve mobile-dist path (next to the exe or in project root)
        {
            let mut dist_path = MOBILE_DIST_PATH.lock().unwrap();
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()))
                .unwrap_or_else(|| PathBuf::from("."));
            
            // Try: exe_dir/mobile-dist, then exe_dir/../mobile-dist
            let candidates = vec![
                exe_dir.join("mobile-dist"),
                exe_dir.join("../mobile-dist"),
                PathBuf::from("mobile-dist"),
            ];
            
            for candidate in candidates {
                if candidate.exists() && candidate.is_dir() {
                    println!("[SyncServer] Mobile dist found: {:?}", candidate.canonicalize().unwrap_or(candidate.clone()));
                    *dist_path = Some(candidate);
                    break;
                }
            }
            
            if dist_path.is_none() {
                println!("[SyncServer] No mobile-dist directory found, static serving disabled");
            }
        }

        // Bind the port with retry (OS may take time to release)
        let server_addr = format!("0.0.0.0:{}", port);
        let mut server = None;
        for attempt in 0..3 {
            match Server::http(&server_addr) {
                Ok(s) => { server = Some(s); break; }
                Err(e) => {
                    if attempt < 2 {
                        println!("Port {} busy, retrying in 500ms (attempt {}/3)...", port, attempt + 1);
                        thread::sleep(Duration::from_millis(500));
                    } else {
                        return Err(format!("Cannot start server on port {}: {}", port, e));
                    }
                }
            }
        }
        let server = server.unwrap();

        // Generate random token
        let token = uuid::Uuid::new_v4().to_string();
        let running = Arc::new(Mutex::new(true));

        // Store globally for stop() to access
        {
            let mut global_running = SERVER_RUNNING.lock().unwrap();
            *global_running = Some(running.clone());
        }

        let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?.to_string();
        let running_clone = running.clone();
        let _token_clone = token.clone();

        // Spawn server thread — port is ALREADY bound, so server is ready immediately
        thread::spawn(move || {
            println!("Sync server listening on 0.0.0.0:{}", port);
            let mut _last_request = Instant::now();

            loop {
                // Check if stopped
                if !*running_clone.lock().unwrap() {
                    break;
                }

                // Auto-shutdown disabled to keep connection alive
                /*
                if last_request.elapsed() > Duration::from_secs(300) {
                    println!("Sync server auto-shutdown due to idle.");
                    let mut r = running_clone.lock().unwrap();
                    *r = false;
                    break;
                }
                */

                match server.recv_timeout(Duration::from_millis(500)) {
                    Ok(Some(mut request)) => {
                        _last_request = Instant::now();

                        // Handle CORS Preflight
                        if *request.method() == Method::Options {
                            let response = Response::empty(200)
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap())
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Authorization, Content-Type"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        // LAN-only solo use — no auth required

                        let req_url = request.url().to_string();

                        // Read POST body BEFORE entering handler (request is mut here)
                        let req_method = request.method().clone();
                        let body = if req_method == Method::Post {
                            let mut buf = String::new();
                            let _ = request.as_reader().read_to_string(&mut buf);
                            Some(buf)
                        } else {
                            None
                        };

                        let response = match handle_request(&req_url, &req_method, body) {
                            Ok(res) => res,
                            Err(e) => {
                                eprintln!("Sync server error: {}", e);
                                Response::from_string(json!({"error": e}).to_string())
                                    .with_status_code(500)
                                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                            }
                        };

                        let response = response
                            .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                            .with_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap())
                            .with_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Authorization, Content-Type"[..]).unwrap());
                        let _ = request.respond(response);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("Sync server recv error: {}", e);
                    }
                }
            }

            println!("Sync server stopped.");
            let mut global_running = SERVER_RUNNING.lock().unwrap();
            *global_running = None;
            let mut data = SYNC_DATA.lock().unwrap();
            *data = None;
        });

        Ok(json!({
            "ip": ip,
            "port": port,
            "token": token
        }))
    }

    pub fn stop() {
        let mut global_running = SERVER_RUNNING.lock().unwrap();
        if let Some(ref running) = *global_running {
            let mut r = running.lock().unwrap();
            *r = false;
        }
        *global_running = None;
        let mut data = SYNC_DATA.lock().unwrap();
        *data = None;
    }

    /// Poll for incoming corrections from mobile
    pub fn take_corrections() -> Vec<serde_json::Value> {
        let mut corrections = INCOMING_CORRECTIONS.lock().unwrap();
        let result = corrections.clone();
        corrections.clear();
        result
    }
}

fn handle_request(url: &str, method: &Method, body: Option<String>) -> Result<Response<std::io::Cursor<Vec<u8>>>, String> {
    let parts: Vec<&str> = url.split('?').collect();
    let path = parts[0];
    let query = if parts.len() > 1 { parts[1] } else { "" };

    let params: std::collections::HashMap<String, String> = query.split('&')
        .filter(|s| !s.is_empty())
        .map(|s| {
            let mut kv = s.splitn(2, '=');
            let key = kv.next().unwrap_or("").to_string();
            let val = kv.next().unwrap_or("").to_string();
            (key, val)
        }).collect();

    match (path, method) {
        ("/status", _) => {
            let data = json!({ "app": "raiden", "version": "1.0", "status": "ok" });
            Ok(Response::from_string(data.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()))
        },

        // GET /api/version — returns hash of sw.js so mobile can detect new builds
        ("/api/version", _) => {
            let dist_path = MOBILE_DIST_PATH.lock().unwrap();
            let hash = if let Some(ref dist_dir) = *dist_path {
                let sw_path = dist_dir.join("sw.js");
                match std::fs::read(&sw_path) {
                    Ok(content) => {
                        // Simple hash: length + first/last bytes
                        let len = content.len();
                        let first = content.first().copied().unwrap_or(0) as u64;
                        let last = content.last().copied().unwrap_or(0) as u64;
                        format!("{:x}", len as u64 * 31 + first * 997 + last * 7919)
                    },
                    Err(_) => "unknown".to_string(),
                }
            } else {
                "no-dist".to_string()
            };
            let data = json!({ "hash": hash });
            Ok(Response::from_string(data.to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                .with_header(Header::from_bytes(&b"Cache-Control"[..], &b"no-cache, no-store"[..]).unwrap()))
        },

        // POST /corrections — receive corrections from mobile
        ("/corrections", &Method::Post) => {
            let body_str = body.ok_or("Missing request body")?;
            let corrections: serde_json::Value = serde_json::from_str(&body_str)
                .map_err(|e| format!("Invalid corrections JSON: {}", e))?;

            let count = if let Some(arr) = corrections.as_array() {
                let mut store = INCOMING_CORRECTIONS.lock().unwrap();
                let len = arr.len();
                for c in arr {
                    store.push(c.clone());
                }
                len
            } else {
                let mut store = INCOMING_CORRECTIONS.lock().unwrap();
                store.push(corrections);
                1
            };

            println!("[SyncServer] Received {} correction(s) from mobile", count);
            Ok(Response::from_string(json!({ "status": "received", "count": count }).to_string())
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()))
        },

        // GET endpoints below need sync data
        ("/manifest", _) | ("/workspace", _) | ("/dictionary", _) | ("/chapters", _) => {
            handle_get_request(path, method, &params)
        },

        // Everything else → try static file serving for mobile PWA
        _ => {
            serve_static_file(path)
        }
    }
}

fn serve_static_file(path: &str) -> Result<Response<std::io::Cursor<Vec<u8>>>, String> {
    let dist_path = MOBILE_DIST_PATH.lock().unwrap();
    let dist_dir = match dist_path.as_ref() {
        Some(p) => p.clone(),
        None => return Ok(Response::from_string(json!({"error": "Mobile app not installed"}).to_string())
            .with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())),
    };
    drop(dist_path); // Release lock early

    // Resolve file path
    let clean_path = if path == "/" { "/index.html" } else { path };
    let file_path = dist_dir.join(clean_path.trim_start_matches('/'));
    
    // Try exact file, then fallback to index.html (SPA routing)
    let target = if file_path.is_file() {
        file_path
    } else {
        dist_dir.join("index.html")
    };

    // Security: ensure resolved target is within dist_dir (prevent directory traversal)
    if let (Ok(canonical_dist), Ok(canonical_target)) = (dist_dir.canonicalize(), target.canonicalize()) {
        if !canonical_target.starts_with(&canonical_dist) {
            return Ok(Response::from_string("Forbidden").with_status_code(403)
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/plain"[..]).unwrap()));
        }
    }

    match std::fs::read(&target) {
        Ok(content) => {
            let mime = match target.extension().and_then(|e| e.to_str()) {
                Some("html") => "text/html; charset=utf-8",
                Some("css") => "text/css",
                Some("js") | Some("mjs") => "application/javascript",
                Some("json") | Some("webmanifest") => "application/json",
                Some("svg") => "image/svg+xml",
                Some("png") => "image/png",
                Some("ico") => "image/x-icon",
                Some("woff2") => "font/woff2",
                Some("woff") => "font/woff",
                Some("webp") => "image/webp",
                _ => "application/octet-stream",
            };
            Ok(Response::from_data(content)
                .with_header(Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap())
                .with_header(Header::from_bytes(&b"Cache-Control"[..], &b"public, max-age=3600"[..]).unwrap()))
        },
        Err(_) => Ok(Response::from_string("Not Found").with_status_code(404)
            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/plain"[..]).unwrap())),
    }
}

fn handle_get_request(
    path: &str,
    method: &Method,
    params: &std::collections::HashMap<String, String>,
) -> Result<Response<std::io::Cursor<Vec<u8>>>, String> {
    let data_guard = SYNC_DATA.lock().unwrap();
    let sync_data = data_guard.as_ref().ok_or("No sync data available")?;

    // Library sync: { workspaces: [...], chapters: { wsId: [...] }, dictionary: { wsId: [...] } }
    let workspaces = sync_data["workspaces"].as_array()
        .ok_or("workspaces is not an array")?;
    let chapters_map = &sync_data["chapters"];
    let dictionary_map = &sync_data["dictionary"];

    let json_header = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();

    match (path, method) {
        ("/manifest", &Method::Get) => {
            let ws_list: Vec<serde_json::Value> = workspaces.iter().map(|ws| {
                let ws_id = ws["id"].as_str().unwrap_or("");
                let ch_count = chapters_map[ws_id].as_array().map(|a| a.len()).unwrap_or(0);
                json!({ "id": ws_id, "title": ws["title"], "chapterCount": ch_count })
            }).collect();
            let total: usize = ws_list.iter()
                .map(|ws| ws["chapterCount"].as_u64().unwrap_or(0) as usize).sum();
            Ok(Response::from_string(json!({
                "workspaces": ws_list, "totalChapters": total, "totalWorkspaces": ws_list.len()
            }).to_string()).with_header(json_header))
        },
        ("/workspace", &Method::Get) => {
            let ws_id = params.get("id").ok_or("Missing 'id' parameter")?;
            let ws = workspaces.iter()
                .find(|w| w["id"].as_str() == Some(ws_id.as_str()))
                .ok_or(format!("Workspace '{}' not found", ws_id))?;
            Ok(Response::from_string(ws.to_string()).with_header(json_header))
        },
        ("/dictionary", &Method::Get) => {
            let ws_id = params.get("workspaceId").map(|s| s.as_str()).unwrap_or("");
            let dict = &dictionary_map[ws_id];
            let result = if dict.is_null() { json!([]) } else { dict.clone() };
            Ok(Response::from_string(result.to_string()).with_header(json_header))
        },
        ("/chapters", &Method::Get) => {
            let ws_id = params.get("workspaceId").map(|s| s.as_str()).unwrap_or("");
            let offset: usize = params.get("offset").and_then(|s| s.parse().ok()).unwrap_or(0);
            let limit: usize = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(50);
            let chunk: Vec<&serde_json::Value> = match chapters_map[ws_id].as_array() {
                Some(arr) => arr.iter().skip(offset).take(limit).collect(),
                None => vec![],
            };
            Ok(Response::from_string(json!(chunk).to_string()).with_header(json_header))
        },
        _ => Ok(Response::from_string(json!({"error": "Not Found"}).to_string())
            .with_status_code(404).with_header(json_header)),
    }
}
