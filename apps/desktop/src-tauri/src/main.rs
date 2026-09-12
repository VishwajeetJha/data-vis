use std::sync::{Arc, Mutex};

mod commands;
mod sidecar;
mod window_manager;

fn main() {
    let port = sidecar::find_ephemeral_port();
    println!("data-vis backend loopback port: {}", port);

    // Spawn backend Python sidecar subprocess
    let sidecar_child = sidecar::spawn_python_sidecar();
    let child_arc = Arc::new(Mutex::new(sidecar_child));
    let child_arc_exit = Arc::clone(&child_arc);

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_backend_port,
            commands::open_file_dialog,
            commands::create_popout_window,
            commands::close_popout_window
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_app_handle, event| match event {
        tauri::RunEvent::Exit => {
            println!("Tauri exit requested. Terminating Python sidecar process...");
            if let Ok(mut guard) = child_arc_exit.lock() {
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    println!("Python sidecar process killed successfully.");
                }
            }
        }
        _ => {}
    });
}
