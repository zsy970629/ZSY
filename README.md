# 食算｜AI 食物熱量辨識 App

這是一個可在電腦與手機瀏覽器使用的最小完整專案：上傳食物照片後，由 CGU LLM Gateway 的多模態模型估算熱量與三大營養素。

## Windows 啟動方式

### 1. 安裝 Node.js

請先安裝 Node.js 18 以上版本。安裝完成後，請關閉目前的 PowerShell，再開一個新的 PowerShell，確認：

```powershell
node --version
npm --version
```

兩個指令都應該顯示版本號。

### 2. 切換到專案資料夾

PowerShell 預設可能在 `C:\Windows\System32`，必須先切換資料夾：

```powershell
Set-Location "C:\Users\USER\Documents\ChatGPT\食物app"
Get-ChildItem
```

你應該會看到 `package.json`、`server.js` 和 `public` 資料夾。

### 3. 安裝套件

```bash
npm install
```

### 4. 設定 CGU API Key

在專案資料夾內複製 `.env.example` 為 `.env`：

```powershell
Copy-Item .env.example .env
notepad .env
```

將 `CGU_API_KEY` 改成你的實際金鑰：

```env
CGU_API_KEY=你的實際_API_KEY
```

不要把 `.env` 上傳到 GitHub 或分享給別人。

### 5. 啟動

```bash
npm run dev
```

開啟 <http://localhost:3000>。手機要在同一個 Wi-Fi 使用時，可將 `localhost` 改成執行這台電腦的區域網路 IP。

## 技術說明

- 前端：原生 HTML / CSS / JavaScript，響應式設計，不需要建置工具。
- 後端：Node.js + Express + Multer。
- AI：CGU LLM Gateway `/v1/chat/completions`，預設模型為 `gemma-4-26b-a4b-it`。
- API Key 僅由後端讀取，瀏覽器不會接觸金鑰。
- 歷史紀錄只存在目前瀏覽器的 localStorage。

熱量與營養素是影像模型的估算值，僅供日常飲食參考。
