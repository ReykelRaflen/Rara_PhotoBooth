export const scanFrame = async (imageUrl: string) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });
    const SCAN_W = 400; const SCAN_H = Math.floor(SCAN_W * (img.height / img.width));
    const canvas = document.createElement('canvas'); canvas.width = SCAN_W; canvas.height = SCAN_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SCAN_W, SCAN_H);
    const imgData = ctx.getImageData(0, 0, SCAN_W, SCAN_H).data;
    const visited = new Uint8Array(SCAN_W * SCAN_H);
    const holes =[]; const queue = new Int32Array(SCAN_W * SCAN_H);

    for (let y = 0; y < SCAN_H; y++) {
      for (let x = 0; x < SCAN_W; x++) {
        const i = y * SCAN_W + x; if (visited[i]) continue;
        if (imgData[i * 4 + 3] < 128) {
          let minX = x, maxX = x, minY = y, maxY = y, head = 0, tail = 0, area = 0;
          queue[tail++] = i; visited[i] = 1;
          while (head < tail) {
            const curr = queue[head++]; const cx = curr % SCAN_W; const cy = Math.floor(curr / SCAN_W); area++;
            if (cx < minX) minX = cx; if (cx > maxX) maxX = cx; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
            if (cx > 0) { const ni = curr - 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cx < SCAN_W - 1) { const ni = curr + 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy > 0) { const ni = curr - SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy < SCAN_H - 1) { const ni = curr + SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
          }
          const boxW = maxX - minX;
          const boxH = maxY - minY;
          if (area > 2000 && boxH > (SCAN_H * 0.05) && boxW > (SCAN_W * 0.1)) {
            holes.push({ x: minX / SCAN_W, y: minY / SCAN_H, w: boxW / SCAN_W, h: boxH / SCAN_H });
          }
        } else { visited[i] = 1; }
      }
    }
    holes.sort((a, b) => { if (Math.abs(a.y - b.y) < 0.05) return a.x - b.x; return a.y - b.y; });
    return holes;
  };

