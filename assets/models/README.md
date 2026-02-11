# AI Model Files

⚠️ **Model files are NOT bundled with the app due to size constraints (1.6GB+)**

## For Development Testing

To test on-device AI locally, you need to manually transfer model files to the device:

### Models Needed:
1. **Efficient Mode**: `gemma-2-2b-it-Q4_K_M.gguf` (1.6GB)
2. **Balanced Mode**: `Llama-3.2-3B-Instruct-Q4_K_M.gguf` (2GB)
3. **Quality Mode**: `Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf` (4.9GB)

### Download Models:
See `/docs/MODEL_DOWNLOAD_GUIDE.md` for HuggingFace links

### Manual Transfer to Device:

**Option 1: Using Xcode (iOS)**
1. Connect device via USB
2. Open Xcode → Window → Devices and Simulators
3. Select your device
4. Under "Installed Apps", find "Hush"
5. Click the gear icon → Download Container
6. Navigate to `AppData/Documents/models/`
7. Copy model files into this directory
8. Upload Container back to device

**Option 2: Using Finder (iOS 17+)**
1. Connect device
2. Open Finder
3. Select device in sidebar
4. Go to Files tab
5. Find Hush app
6. Drag model files to app's Documents directory

**Option 3: Using adb (Android)**
```bash
adb push gemma-2-2b-it-Q4_K_M.gguf /sdcard/Android/data/com.discretezero.hush/files/models/
```

## For Production

In production, implement one of these approaches:
1. **In-App Download**: Add download UI with progress tracking (recommended)
2. **CDN Hosting**: Host models on CDN, download on first launch
3. **Optional Download**: Make AI features require manual model download

---

**Why not bundle?**
- Metro bundler cannot process files >1GB
- App Store size limits (200MB download limit before Wi-Fi required)
- Flexible model updates without app update
- Standard pattern for on-device AI apps
