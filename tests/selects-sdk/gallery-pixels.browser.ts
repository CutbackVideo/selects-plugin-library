import { ExportFrameRenderer } from "@/external-services/wasm-video-renderer/ExportFrameRenderer";
import { ExportMedia } from "@/external-services/wasm-video-renderer/ExportMedia";
import { ExportClock } from "@/external-services/wasm-video-renderer/ExportClock";
import { ExportCompositor } from "@/external-services/wasm-video-renderer/ExportCompositor";
(window as any).galleryRender = async (
  input: any,
  frames: number[],
  saveFrames: number[],
) => {
  const controller = new AbortController(),
    signal = controller.signal;
  const clock = await ExportClock.create(signal),
    media = new ExportMedia(
      signal,
      new Map(
        input.files
          .filter((f: any) => f.filename.endsWith(".mp4"))
          .map((f: any) => [f.url, 60]),
      ),
    );
  const renderer = await ExportFrameRenderer.create(
    input.scene,
    input.remotion,
    frames,
    media,
    clock,
  );
  const compositor = await ExportCompositor.create(
    input.scene.width,
    input.scene.height,
  );
  const output = new OffscreenCanvas(input.scene.width, input.scene.height),
    context = output.getContext("2d")!;
  const results = [];
  try {
    for (const frame of frames) {
      const layers = await renderer.render(frame, signal);
      try {
        await compositor.draw(layers, input.scene.width, input.scene.height);
      } finally {
        for (const layer of layers) layer.frame.close();
      }
      context.drawImage(compositor.canvas, 0, 0);
      const cells = [],
        points = [];
      for (let index = 0; index < 21; index++) {
        const x = Math.floor(((index % 3) + 0.5) * 360),
          y = Math.floor(((Math.floor(index / 3) + 0.5) * 1920) / 7);
        const data = context.getImageData(x - 2, y - 2, 5, 5).data;
        const sum = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4)
          for (let c = 0; c < 3; c++) sum[c] += data[i + c];
        cells.push(sum.map((v) => v / 25));
        points.push(
          [-70, 0, 70].flatMap((dx) =>
            [-55, 0, 55].map((dy) =>
              [...context.getImageData(x + dx, y + dy, 1, 1).data].slice(0, 3),
            ),
          ),
        );
      }
      const borders = [...Array(7)]
        .flatMap((_, row) =>
          [360, 720].map((x) =>
            [
              ...context.getImageData(
                x,
                Math.floor(((row + 0.5) * 1920) / 7),
                1,
                1,
              ).data,
            ].slice(0, 3),
          ),
        )
        .concat(
          [...Array(6)].flatMap((_, row) =>
            [180, 540, 900].map((x) =>
              [
                ...context.getImageData(
                  x,
                  Math.round(((row + 1) * 1920) / 7),
                  1,
                  1,
                ).data,
              ].slice(0, 3),
            ),
          ),
        );
      let png: string | null = null;
      if (saveFrames.includes(frame)) {
        const blob = await output.convertToBlob({ type: "image/png" }),
          bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        png = btoa(binary);
      }
      results.push({ frame, cells, points, borders, png });
    }
    return results;
  } finally {
    await renderer.dispose();
    await media.dispose();
    compositor.dispose();
    controller.abort();
  }
};
