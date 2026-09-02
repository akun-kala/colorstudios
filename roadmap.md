# Color Grade Transfer — Development Roadmap

## Phase 1: Core Architecture & Performance ✅
**Status:** COMPLETE
- Vite + TypeScript, modular ES6
- Web Worker offload, WebGL 3D LUT renderer
- Centralized state, localStorage preset
- Export: .cube, .xmp

## Phase 2: UX Professional Tools ✅
**Status:** COMPLETE
- Split-screen before/after (vertical drag)
- Blink toggle (Shift / tombol)
- Histogram RGB + Luma, Vectorscope, Waveform
- Zoom 0.5x–4x + panning
- Undo/Redo stack (Ctrl+Z / Ctrl+Y), max 50 steps
- Color picker hover tooltip

## Phase 3: Advanced Features & Distribution ✅
**Status:** COMPLETE (PROJECT FINISHED)
- Batch multi-file processing
- Hue-range protection slider
- Export format: .cube, .xmp, .look, .vlt, .xml, PNG HALD
- PWA: manifest.json, service worker, offline support
- Accessibility: ARIA labels, keyboard nav, focus-visible, reduced-motion

---

## Instruksi Deploy & Penggunaan

### Development
```bash
cd color-grade-transfer
npm install
npm run dev        # http://localhost:5173
```

### Production Build
```bash
npm run build      # output ke dist/
```

### Deploy
Deploy folder `dist/` ke:
- Vercel: `vercel --prod`
- Netlify: drag & drop dist/ ke dashboard
- GitHub Pages: push dist/ ke branch gh-pages

**Catatan:** PWA memerlukan HTTPS.

### Fitur Keyboard
| Shortcut | Aksi |
|----------|------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Shift (tahan) | Blink original |
| Tab | Navigasi antar control |
| Enter/Space | Aktivasi button/drop zone |

### Batch Processing
1. Drop multiple file ke Target zone, atau
2. Pilih multiple file via file picker
3. Tombol "Proses Batch" muncul
4. Hasil di-download satu per satu sebagai PNG
