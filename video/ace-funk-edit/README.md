# Ace Funk Edit

Edit de 15s em Remotion: headbop do Ace sincronizado no beat de "Funk de Beleza" (Nateki, Scythermane & MC MAYAH).

## Render

1. Baixe a faixa, corte 15s a partir de um beat (~53.45s na versão completa) e salve como `public/funk15.mp3`:
   `yt-dlp -x --audio-format mp3 "ytsearch1:Funk de Beleza Nateki"` + `ffmpeg -ss 53.45 -t 15 -i funk.mp3 funk15.mp3`
2. `npm install`
3. `npm run render` → `out/ace-funk-edit.mp4` (1080x1920, 30fps, 15s)

`public/data.json` guarda os timestamps dos beats e o envelope de energia usados pela composição.
