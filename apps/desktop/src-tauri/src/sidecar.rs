use std::path::PathBuf;
use std::process::{Child, Command};
use std::env;

pub fn find_ephemeral_port() -> u16 {
    8000
}

fn find_backend_files() -> Option<(PathBuf, PathBuf, PathBuf)> {
    let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut check_dirs = vec![
        cwd.clone(),
        cwd.join(".."),
        cwd.join("../.."),
        cwd.join("../../.."),
    ];

    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            check_dirs.push(exe_dir.to_path_buf());
            check_dirs.push(exe_dir.join(".."));
            check_dirs.push(exe_dir.join("../.."));
        }
    }

    for dir in check_dirs {
        let venv_dir = dir.join("packages/backend/.venv");
        let venv_python = venv_dir.join("bin/python");
        let backend_main = dir.join("packages/backend/main.py");

        if venv_python.exists() && backend_main.exists() {
            return Some((venv_python, backend_main, venv_dir));
        }
    }

    None
}

pub fn spawn_python_sidecar() -> Option<Child> {
    if let Some((python_path, main_path, venv_dir)) = find_backend_files() {
        println!(
            "Spawning Python backend engine:\n  Python: {:?}\n  Script: {:?}\n  Venv: {:?}",
            python_path, main_path, venv_dir
        );

        let parent_dir = main_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));

        Command::new(&python_path)
            .arg(&main_path)
            .current_dir(&parent_dir)
            .env("PORT", "8000")
            .env("HOST", "127.0.0.1")
            .env("VIRTUAL_ENV", &venv_dir)
            .spawn()
            .map_err(|e| {
                eprintln!("Failed to spawn backend process: {}", e);
                e
            })
            .ok()
    } else {
        eprintln!("Could not locate packages/backend/.venv/bin/python. Running in detached mode.");
        None
    }
}
