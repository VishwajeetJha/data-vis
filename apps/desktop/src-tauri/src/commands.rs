use serde::{Deserialize, Serialize};
use tauri::Manager;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_backend_port() -> Result<u16, String> {
    // Dynamic port returned to webview
    Ok(8000)
}

#[tauri::command]
pub fn open_file_dialog() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
pub async fn create_popout_window(
    app: tauri::AppHandle,
    card_id: String,
    title: String,
) -> Result<(), String> {
    let window_label = format!("popout-{}", card_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        let _ = window.set_focus();
        return Ok(());
    }

    let url = format!("/#/popout/{}", card_id);
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::App(url.into()),
    )
    .title(&title)
    .inner_size(800.0, 600.0)
    .min_inner_size(400.0, 300.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn close_popout_window(
    app: tauri::AppHandle,
    card_id: String,
) -> Result<(), String> {
    let window_label = format!("popout-{}", card_id);
    if let Some(window) = app.get_webview_window(&window_label) {
        let _ = window.close();
    }
    Ok(())
}
