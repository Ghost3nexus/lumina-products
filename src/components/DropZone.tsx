import { useState, type DragEvent } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: Props) {
  const [hover, setHover] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setHover(false);
    const files = Array.from(e.dataTransfer.files).filter(f => /^image\//.test(f.type));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${hover ? 'border-[#00d4ff] bg-[#00d4ff]/5' : 'border-[#1a1a2e] bg-[#0a0a0f]'}`}
    >
      <div className="mb-3 text-base font-medium">写真をここにドラッグ＆ドロップ</div>
      <div className="text-xs text-[#888] mb-5">
        front + back の2枚 × N SKU を一括投入。連番で自動ペアリング、後でUI訂正可。
      </div>
      <label className="inline-block cursor-pointer rounded border border-[#1a1a2e] bg-[#0f0f14] px-5 py-2 text-sm hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors">
        ファイルを選択
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            if (files.length) onFiles(files);
          }}
        />
      </label>
    </div>
  );
}
