export function Header() {
  return (
    <header className="border-b border-[#1a1a2e] bg-[#0a0a0f] px-8 py-5">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            LUMINA <span className="text-[#00d4ff]">PRODUCTS</span>
          </h1>
          <p className="text-xs text-[#888] mt-0.5">iPhone 平置き → ハイブランドEC品質物撮り</p>
        </div>
        <div className="text-xs text-[#555]">
          gemini-2.5-flash analyze · gemini-3.1-flash-image-preview generate
        </div>
      </div>
    </header>
  );
}
