import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const cguBaseUrl = 'https://air.cgu.edu.tw/cgullmapi/v1';
const model = process.env.CGU_MODEL || 'gemma-4-26b-a4b-it';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, /^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype));
  },
});

app.use(express.static(path.join(__dirname, '.')));

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || '').join('');
  }
  return '';
}

function parseJson(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 回傳格式不是有效 JSON');
    return JSON.parse(match[0]);
  }
}

function normalizeResult(result) {
  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  };
  const items = Array.isArray(result.items) ? result.items : [];
  return {
    dishName: String(result.dishName || '無法辨識的餐點').slice(0, 80),
    confidence: Math.min(100, Math.max(0, numberOrZero(result.confidence))),
    calories: numberOrZero(result.calories),
    protein: numberOrZero(result.protein),
    carbs: numberOrZero(result.carbs),
    fat: numberOrZero(result.fat),
    serving: String(result.serving || '以照片中的份量估算').slice(0, 120),
    note: String(result.note || '熱量為 AI 估算值，實際數值會因食材與份量而異。').slice(0, 300),
    items: items.slice(0, 8).map((item) => ({
      name: String(item?.name || '未命名食材').slice(0, 50),
      calories: numberOrZero(item?.calories),
    })),
  };
}

app.post('/api/analyze', upload.single('foodImage'), async (req, res) => {
  if (!process.env.CGU_API_KEY) {
    return res.status(500).json({ error: '尚未設定 CGU_API_KEY，請先建立 .env 檔案。' });
  }
  if (!req.file) {
    return res.status(400).json({ error: '請上傳一張食物照片。' });
  }

  const imageDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const prompt = `你是營養估算助手。請分析這張食物照片，使用繁體中文回答。\n\n重要規則：\n1. 只回傳 JSON，不要 Markdown、不要額外說明。\n2. 熱量與營養素是估算值，不要假裝精確。\n3. 若照片不是食物，dishName 請填「無法辨識為食物」，並將數值設為 0。\n4. calories、protein、carbs、fat 和 items[*].calories 都是非負整數；protein/carbs/fat 單位為公克。\n5. confidence 是 0 到 100 的整數。\n\nJSON 格式：\n{\n  "dishName": "餐點名稱",\n  "confidence": 85,\n  "calories": 520,\n  "protein": 24,\n  "carbs": 58,\n  "fat": 18,\n  "serving": "估計份量",\n  "note": "簡短的估算依據與提醒",\n  "items": [{"name": "食材或組成", "calories": 200}]\n}`;

  try {
    const response = await fetch(`${cguBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CGU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
        temperature: 0.2,
        max_completion_tokens: 500,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || data?.message || `CGU API 回應 ${response.status}`;
      return res.status(502).json({ error: detail });
    }
    const parsed = parseJson(extractText(data));
    return res.json({ result: normalizeResult(parsed), model });
  } catch (error) {
    console.error('CGU analyze error:', error);
    return res.status(500).json({ error: error.message || '辨識失敗，請稍後再試。' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, model }));

app.listen(port, () => {
  console.log(`AI Food Calorie App running at http://localhost:${port}`);
});
