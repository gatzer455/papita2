#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Default, Serialize, Deserialize, Clone)]
struct ApiResponse {
    generated_code: String,
    error: Option<String>,
}

struct AppState {
    api_key: Mutex<Option<String>>,
}

#[tauri::command]
async fn generate_code(
    app_state: State<'_, AppState>,
    prompt: String,
) -> Result<ApiResponse, String> {
    let api_key = app_state.api_key.lock().unwrap().clone();
    
    if api_key.is_none() {
        return Err("API key not set".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key.unwrap())
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-3-opus-20240229",
            "max_tokens": 4000,
            "messages": [
                {
                    "role": "user",
                    "content": format!("Generate only code for the following task: {}", prompt)
                }
            ]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API request failed: {}", response.status()));
    }

    let response_body = response.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
    
    // Parse the Claude API response
    if let Some(content) = response_body["content"].as_array() {
        if !content.is_empty() {
            if let Some(text) = content[0]["text"].as_str() {
                // Basic sanitization - extract code blocks
                let code = extract_code_blocks(text);
                return Ok(ApiResponse {
                    generated_code: code,
                    error: None,
                });
            }
        }
    }

    Err("Failed to parse response from Claude API".to_string())
}

#[tauri::command]
fn set_api_key(app_state: State<'_, AppState>, key: String) -> Result<(), String> {
    let mut api_key = app_state.api_key.lock().unwrap();
    *api_key = Some(key);
    Ok(())
}

fn extract_code_blocks(text: &str) -> String {
    // Simple extraction of code blocks between ```
    let mut code_blocks = Vec::new();
    let mut in_code_block = false;
    let mut current_block = String::new();
    
    for line in text.lines() {
        if line.trim().starts_with("```") {
            if in_code_block {
                code_blocks.push(current_block.clone());
                current_block.clear();
            } else {
                current_block = String::new();
            }
            in_code_block = !in_code_block;
        } else if in_code_block {
            current_block.push_str(line);
            current_block.push('\n');
        }
    }
    
    code_blocks.join("\n\n")
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            api_key: Mutex::new(None),
        })
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![generate_code, set_api_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}