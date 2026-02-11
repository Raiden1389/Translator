use std::sync::{Arc, Mutex};
use std::thread;
use tiny_http::{Server, Response, Header, Method};
use serde_json::json;
use std::time::{Duration, Instant};

static SERVER_RUNNING: Mutex<Option<Arc<Mutex<bool>>>> = Mutex::new(None);

/// In-memory sync data loaded from Desktop's Dexie IndexedDB
static SYNC_DATA: Mutex<Option<serde_json::Value>> = Mutex::new(None);

pub struct SyncServer;

impl SyncServer {
    pub fn start(port: u16, sync_data: String) -> Result<serde_json::Value, String> {
        // Stop any existing server first
        Self::stop();

        // Wait a bit for the old server thread to release the port
        thread::sleep(Duration::from_millis(200));

        // Parse & store sync data in memory
        let parsed: serde_json::Value = serde_json::from_str(&sync_data)
            .map_err(|e| format!("Failed to parse sync data: {}", e))?;
        {
            let mut data = SYNC_DATA.lock().unwrap();
            *data = Some(parsed);
        }

        // Bind the port FIRST (before returning success to frontend)
        let server_addr = format!("0.0.0.0:{}", port);
        let server = Server::http(&server_addr)
            .map_err(|e| format!("Cannot start server on port {}: {}", port, e))?;

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
        let token_clone = token.clone();

        // Spawn server thread — port is ALREADY bound, so server is ready immediately
        thread::spawn(move || {
            println!("Sync server listening on 0.0.0.0:{}", port);
            let mut last_request = Instant::now();

            loop {
                // Check if stopped
                if !*running_clone.lock().unwrap() {
                    break;
                }

                // Auto-shutdown after 5 minutes of idle
                if last_request.elapsed() > Duration::from_secs(300) {
                    println!("Sync server auto-shutdown due to idle.");
                    let mut r = running_clone.lock().unwrap();
                    *r = false;
                    break;
                }

                match server.recv_timeout(Duration::from_millis(500)) {
                    Ok(Some(request)) => {
                        last_request = Instant::now();

                        // Handle CORS Preflight
                        if *request.method() == Method::Options {
                            let response = Response::empty(200)
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap())
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Authorization, Content-Type"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        // Check Authorization Token
                        let auth_header = request.headers().iter()
                            .find(|h| h.field.as_str().to_string().to_lowercase() == "authorization");
                        let is_authorized = match auth_header {
                            Some(h) => h.value.as_str() == format!("Bearer {}", token_clone),
                            None => false,
                        };

                        let req_url = request.url().to_string();

                        if !is_authorized && req_url != "/status" {
                            let response = Response::from_string("Unauthorized")
                                .with_status_code(401)
                                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        let req_method = request.method().clone();
                        let response = match handle_request(&req_url, &req_method) {
                            Ok(res) => res,
                            Err(e) => {
                                eprintln!("Sync server error: {}", e);
                                Response::from_string(json!({"error": e}).to_string())
                                    .with_status_code(500)
                            }
                        };

                        let response = response
                            .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
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
}

fn handle_request(url: &str, method: &Method) -> Result<Response<std::io::Cursor<Vec<u8>>>, String> {
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

    // Lock sync data once for the duration of request handling
    let data_guard = SYNC_DATA.lock().unwrap();
    let sync_data = data_guard.as_ref().ok_or("No sync data available")?;

    // sync_data structure: { workspace: {...}, chapters: [...], dictionary: [...] }
    let workspace = &sync_data["workspace"];
    let chapters = sync_data["chapters"].as_array().ok_or("chapters is not an array")?;
    let dictionary = &sync_data["dictionary"];

    match (path, method) {
        ("/status", _) => {
            let data = json!({ "app": "raiden", "version": "1.0", "status": "ok" });
            Ok(Response::from_string(data.to_string()))
        },
        ("/manifest", &Method::Get) => {
            let chapters_meta: Vec<serde_json::Value> = chapters.iter().map(|c| {
                json!({
                    "id": c["id"],
                    "order": c["order"],
                    "updatedAt": c["updatedAt"]
                })
            }).collect();

            let data = json!({
                "totalChapters": chapters.len(),
                "chapters": chapters_meta
            });
            Ok(Response::from_string(data.to_string()))
        },
        ("/workspace", &Method::Get) => {
            Ok(Response::from_string(workspace.to_string()))
        },
        ("/dictionary", &Method::Get) => {
            Ok(Response::from_string(dictionary.to_string()))
        },
        ("/chapters", &Method::Get) => {
            let offset: usize = params.get("offset").and_then(|s| s.parse().ok()).unwrap_or(0);
            let limit: usize = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(50);

            let chunk: Vec<&serde_json::Value> = chapters.iter()
                .skip(offset)
                .take(limit)
                .collect();

            Ok(Response::from_string(json!(chunk).to_string()))
        },
        ("/update", &Method::Post) => {
            Ok(Response::from_string(json!({"status": "received"}).to_string()))
        },
        _ => Ok(Response::from_string(json!({"error": "Not Found"}).to_string()).with_status_code(404)),
    }
}
