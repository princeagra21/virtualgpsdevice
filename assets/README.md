# Assets Directory

Place your app icon here as `icon.ico` (for Windows).

If you don't have an icon, electron-builder will use a default one.

## Creating an Icon

You can create a 256x256 PNG logo and convert it to ICO using online tools like:
- https://convertico.com/
- https://icoconvert.com/

Or use ImageMagick:
```bash
convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

