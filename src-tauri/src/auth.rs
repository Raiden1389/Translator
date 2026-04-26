use tiny_http::{Server, Response, Header};
use tauri::{AppHandle, Emitter};
use std::thread;

#[derive(serde::Serialize)]
pub struct AuthServerInfo {
    pub port: u16,
    pub state: String,
}

#[tauri::command]
pub fn start_auth_server(app: AppHandle, port: Option<u16>) -> Result<AuthServerInfo, String> {
    let state = uuid::Uuid::new_v4().to_string();
    let state_clone = state.clone();

    let bind_port = port.unwrap_or(3000);
    let bind_addr = format!("127.0.0.1:{}", bind_port);

    // Attempt to bind to the specified port
    let server = match Server::http(&bind_addr) {
        Ok(s) => s,
        Err(_) => Server::http("127.0.0.1:0").map_err(|e| format!("Failed to start server: {}", e))?,
    };
    let port = server.server_addr().to_ip().unwrap().port();

    thread::spawn(move || {
        println!("Auth server listening on {}", port);
        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            // Basic path match
            if url.starts_with("/token") && request.method() == &tiny_http::Method::Post {
                // Check state in query param
                let is_valid = url.contains(&format!("state={}", state_clone));
                
                if !is_valid {
                    let _ = request.respond(Response::from_string("Unauthorized: State mismatch").with_status_code(403));
                    continue;
                }

                let mut content = String::new();
                if let Err(e) = request.as_reader().read_to_string(&mut content) {
                    println!("Failed to read request body: {}", e);
                }
                
                let _ = app.emit("oauth_token_received", content);
                
                let html = r#"
                    <html>
                    <body style="font-family: sans-serif; background: #0a0514; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                            <h1 style="color: #10b981;">Xác thực thành công!</h1>
                            <p>Đã nhận được khóa truy cập. Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
                        </div>
                    </body>
                    </html>
                "#;
                let response = Response::from_string(html)
                    .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
                break; // Shut down server after we get what we need
            }

            // 2. Serve Bridge HTML to capture fragment
            let bridge_html = r#"
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Raiden AI Authenticator</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0a0514; color: white; margin: 0; }
                        .card { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1.5rem; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 400px; width: 90%; }
                        h2 { margin-bottom: 0.5rem; font-weight: 800; }
                        p { color: rgba(255,255,255,0.5); font-size: 0.9rem; }
                        .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #f59e0b; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2 id="status">Đang xử lý kết nối...</h2>
                        <div id="spinner" class="spinner"></div>
                        <p id="desc">Vui lòng đợi giây lát để ứng dụng nhận token.</p>
                    </div>
                    <script>
                        // Captured Google's Auth Fragment or Code
                        const hash = window.location.hash;
                        const urlParams = new URLSearchParams(window.location.search);
                        const state = urlParams.get('state');
                        const code = urlParams.get('code');

                        if ((hash && hash.includes('access_token')) || code) {
                            // Forward everything we received back to our server
                            const body = code ? window.location.search : hash;
                            
                            fetch(`/token?state=${state}`, {
                                method: 'POST',
                                body: body
                            }).then(() => {
                                document.getElementById('status').innerText = 'Kết nối thành công!';
                                document.getElementById('desc').innerText = 'Dữ liệu đã được gửi về ứng dụng. Bạn có thể đóng cửa sổ này.';
                            }).catch(err => {
                                document.getElementById('status').innerText = 'Lỗi kết nối';
                                document.getElementById('desc').innerText = 'Không thể gửi dữ liệu về ứng dụng: ' + err;
                            });
                        } else {
                            document.getElementById('status').innerText = 'Không tìm thấy Token/Code';
                            document.getElementById('desc').innerText = 'Vui lòng thực hiện lại quy trình đăng nhập.';
                            document.getElementById('spinner').style.display = 'none';
                        }
                    </script>
                </body>
                </html>
            "#;
            
            let response = Response::from_string(bridge_html)
                .with_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
            let _ = request.respond(response);
        }
    });

    Ok(AuthServerInfo { port, state })
}

#[tauri::command]
pub async fn exchange_code_native(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    // Step 1: Exchange code for tokens
    let params = [
        ("code", code),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code".to_string()),
    ];

    let res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", err_body));
    }

    let mut token_data = res.json::<serde_json::Value>().await
        .map_err(|e| format!("Token parse failed: {}", e))?;

    // Step 2: Use access_token to fetch user info
    if let Some(access_token) = token_data.get("access_token").and_then(|v| v.as_str()) {
        let user_res = client
            .get("https://www.googleapis.com/oauth2/v2/userinfo")
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await;

        if let Ok(user_response) = user_res {
            if user_response.status().is_success() {
                if let Ok(user_info) = user_response.json::<serde_json::Value>().await {
                    token_data["user_info"] = user_info;
                }
            }
        }
    }

    Ok(token_data)
}

#[tauri::command]
pub async fn refresh_token_native(
    refresh_token: String,
    client_id: String,
    client_secret: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let params = [
        ("refresh_token", refresh_token),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("grant_type", "refresh_token".to_string()),
    ];

    let res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {}", e))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", err_body));
    }

    let token_data = res.json::<serde_json::Value>().await
        .map_err(|e| format!("Token parse failed: {}", e))?;

    Ok(token_data)
}
