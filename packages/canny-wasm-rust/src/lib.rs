use wasm_bindgen::prelude::*;
use image::{ImageBuffer, RgbaImage, GrayImage};
use imageproc::edges::canny;

#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    Ok(())
}



/// JS sees this as `Uint8Array → Uint8Array`.
///
/// * `input`  – RGBA pixel buffer (length = w × h × 4)
/// * `low` / `high` – Canny thresholds (0‑255)
#[wasm_bindgen]
pub fn detect(
    input: &[u8],
    width: u32,
    height: u32,
    low: f32,
    high: f32,
) -> Vec<u8> {
    // ---------- RGBA → grayscale --------------
    let mut gray: GrayImage = ImageBuffer::new(width, height);
    for (idx, pixel) in input.chunks_exact(4).enumerate() {
        let y = ((0.299 * pixel[0] as f32)
               + (0.587 * pixel[1] as f32)
               + (0.114 * pixel[2] as f32)) as u8;       // BT.601
        let x = (idx as u32) % width;
        let y_coord = (idx as u32) / width;
        gray.put_pixel(x, y_coord, image::Luma([y]));
    }

    // ---------- Canny -------------------------
    let edges = canny(&gray, low, high);

    // ---------- Pack result back to RGBA ------
    let mut out: RgbaImage = ImageBuffer::new(width, height);
    for (idx, &e) in edges.iter().enumerate() {
        let rgba = if e == 0 { [0, 0, 0, 255] } else { [255, 255, 255, 255] };
        let x = (idx as u32) % width;
        let y = (idx as u32) / width;
        out.put_pixel(x, y, image::Rgba(rgba));   // ✅ needs (x, y)
    }
    out.into_raw()   // Vec<u8>
}

