// ─────────────────────────────────────────────
//  textures.jsx
//
//  貼圖相關輔助函式與 React UI 元件
//  供 MazeFirstPerson.jsx 使用
// ─────────────────────────────────────────────
import { TEX_W, TEX_H } from './constants.jsx';

// 將圖片檔載入 TexInfo 物件，供地板投射（ImageData）使用
// 並建立獨立的離屏 canvas 供牆面切片（drawImage）使用
export function loadTexture(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth  || TEX_W;
        const h = img.naturalHeight || TEX_H;
        // 用於 drawImage 牆面切片的離屏 canvas
        const oc = document.createElement('canvas');
        oc.width = w; oc.height = h;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);
        // 用於地板投射的像素陣列
        const id = octx.getImageData(0, 0, w, h);
        resolve({ loaded: true, canvas: oc, data: id.data, w, h, src: e.target.result });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
//  貼圖上傳元件（單一面）
// ─────────────────────────────────────────────
export function TexUpload({ label, texInfo, onLoad }) {
  return (
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", width: 64,
    }}>
      <div style={{
        width: 60, height: 60, border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-md)", overflow: "hidden",
        background: "var(--color-background-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {texInfo?.src
          ? <img src={texInfo.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 20, color: "var(--color-text-tertiary)" }}>+</span>
        }
      </div>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{label}</span>
      <input type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => e.target.files[0] && loadTexture(e.target.files[0]).then(onLoad)} />
    </label>
  );
}

// ─────────────────────────────────────────────
//  區域貼圖列（牆壁 + 天花板 + 地板）
// ─────────────────────────────────────────────
export function ZoneTexRow({ label, zone, onChange, accent, showDoor }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ width: 4, height: 36, borderRadius: 2, background: accent || "#888", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 68, lineHeight: 1.3 }}>{label}</span>
      <TexUpload label="牆壁"   texInfo={zone?.wall}  onLoad={t => onChange({ ...zone, wall: t })} />
      <TexUpload label="天花板" texInfo={zone?.ceil}  onLoad={t => onChange({ ...zone, ceil: t })} />
      <TexUpload label="地板"   texInfo={zone?.floor} onLoad={t => onChange({ ...zone, floor: t })} />
      {showDoor && (
        <TexUpload label="房間門" texInfo={zone?.door} onLoad={t => onChange({ ...zone, door: t })} />
      )}
    </div>
  );
}
