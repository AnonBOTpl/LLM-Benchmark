//! VRAM / GPU sampling through NVML (the same approach as SysPulse).
//!
//! NVML is loaded at runtime, so this module compiles fine on machines without
//! an NVIDIA GPU or without the driver installed - it just reports `available:
//! false` and every VRAM metric stays `None`.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use nvml_wrapper::Nvml;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const VRAM_EVENT: &str = "vram-sample";

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VramSample {
    pub available: bool,
    pub name: Option<String>,
    pub used_mb: u64,
    pub total_mb: u64,
    pub peak_mb: u64,
    pub utilization: Option<u32>,
    /// Why NVML is unavailable - surfaced in the UI instead of failing silently.
    pub error: Option<String>,
}

/// Shared, lock-free view of the current GPU state. The sampler thread owns the
/// `Nvml` handle itself, so nothing that is not `Send` ever crosses a boundary.
#[derive(Clone)]
pub struct Vram {
    available: Arc<AtomicBool>,
    name: Arc<Mutex<Option<String>>>,
    error: Arc<Mutex<Option<String>>>,
    used_mb: Arc<AtomicU64>,
    total_mb: Arc<AtomicU64>,
    peak_mb: Arc<AtomicU64>,
    utilization: Arc<AtomicU64>,
}

impl Vram {
    fn new() -> Self {
        Self {
            available: Arc::new(AtomicBool::new(false)),
            name: Arc::new(Mutex::new(None)),
            error: Arc::new(Mutex::new(None)),
            used_mb: Arc::new(AtomicU64::new(0)),
            total_mb: Arc::new(AtomicU64::new(0)),
            peak_mb: Arc::new(AtomicU64::new(0)),
            utilization: Arc::new(AtomicU64::new(0)),
        }
    }

    fn set_error(&self, message: String) {
        if let Ok(mut slot) = self.error.lock() {
            *slot = Some(message);
        }
    }

    pub fn reset_peak(&self) {
        self.peak_mb
            .store(self.used_mb.load(Ordering::Relaxed), Ordering::Relaxed);
    }

    pub fn peak_mb(&self) -> Option<u64> {
        if self.available.load(Ordering::Relaxed) {
            Some(self.peak_mb.load(Ordering::Relaxed))
        } else {
            None
        }
    }

    pub fn name(&self) -> Option<String> {
        self.name.lock().ok().and_then(|n| n.clone())
    }

    pub fn snapshot(&self) -> VramSample {
        let available = self.available.load(Ordering::Relaxed);
        let util = self.utilization.load(Ordering::Relaxed);
        VramSample {
            available,
            name: self.name(),
            used_mb: self.used_mb.load(Ordering::Relaxed),
            total_mb: self.total_mb.load(Ordering::Relaxed),
            peak_mb: self.peak_mb.load(Ordering::Relaxed),
            utilization: if available && util > 0 {
                Some(util as u32)
            } else {
                None
            },
            error: self.error.lock().ok().and_then(|slot| slot.clone()),
        }
    }
}

/// Spawns the background polling thread and returns the shared handle.
pub fn start_sampler(app: AppHandle, interval: Duration) -> Vram {
    let vram = Vram::new();
    let shared = vram.clone();

    std::thread::spawn(move || {
        let nvml = match Nvml::init() {
            Ok(n) => n,
            Err(error) => {
                // No NVIDIA driver / no NVML library - VRAM metrics are simply
                // unavailable, everything else keeps working.
                shared.set_error(crate::messages::msg(
                    "gpu.nvml_failed",
                    &[("error", &error.to_string())],
                ));
                let _ = app.emit(VRAM_EVENT, shared.snapshot());
                return;
            }
        };

        if let Ok(device) = nvml.device_by_index(0) {
            if let Ok(name) = device.name() {
                if let Ok(mut slot) = shared.name.lock() {
                    *slot = Some(name);
                }
            }
        }
        shared.available.store(true, Ordering::SeqCst);
        let _ = app.emit(VRAM_EVENT, shared.snapshot());

        loop {
            std::thread::sleep(interval);

            let Ok(device) = nvml.device_by_index(0) else {
                continue;
            };
            if let Ok(mem) = device.memory_info() {
                let used_mb = mem.used / 1024 / 1024;
                let total_mb = mem.total / 1024 / 1024;
                shared.used_mb.store(used_mb, Ordering::Relaxed);
                shared.total_mb.store(total_mb, Ordering::Relaxed);
                shared.peak_mb.fetch_max(used_mb, Ordering::Relaxed);
            }
            if let Ok(util) = device.utilization_rates() {
                shared
                    .utilization
                    .store(util.gpu as u64, Ordering::Relaxed);
            }

            // Emit on every tick: the UI listens from the moment it mounts, and
            // a sample sent only while a run is active would leave the GPU card
            // reading "NVML niedostępny" until the first benchmark starts.
            let _ = app.emit(VRAM_EVENT, shared.snapshot());
        }
    });

    vram
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Diagnostyka: czy NVML w ogóle da się zainicjalizować na tej maszynie.
    #[test]
    fn nvml_probe() {
        #[cfg(target_os = "windows")]
        if let Ok(root) = std::env::var("SystemRoot") {
            let path = std::path::PathBuf::from(root)
                .join("System32")
                .join("nvml.dll");
            println!("[probe] {} exists = {}", path.display(), path.exists());
        }

        match Nvml::init() {
            Ok(nvml) => {
                println!("[probe] Nvml::init() = OK");
                match nvml.device_by_index(0) {
                    Ok(device) => println!("[probe] device 0 = {:?}", device.name()),
                    Err(error) => println!("[probe] device_by_index(0) = ERR {error}"),
                }
            }
            Err(error) => println!("[probe] Nvml::init() = FAILED {error} ({error:?})"),
        }
    }
}
