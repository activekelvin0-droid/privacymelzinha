const PLAN_PRICES = { "3meses": 29.9, "1mes": 19.9, "12meses": 39.9 };
const PLAN_DESCRIPTIONS = {
  "3meses": "Subscricao Privacy 3 meses",
  "1mes": "Subscricao Privacy 1 mes",
  "12meses": "Subscricao Privacy 12 meses",
};
const ALLOWED_METHODS = new Set(["mbway", "multibanco"]);

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isNIF = (s) => typeof s === "string" && /^\d{9}$/.test(s);
const isPhone = (s) => typeof s === "string" && /^\d{9,15}$/.test(s.replace(/\D/g, ""));

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const { plan, method, name, email, phone, document } = req.body || {};

  if (!plan || !PLAN_PRICES[plan]) return res.status(400).json({ error: "Plano inválido" });
  if (!method || !ALLOWED_METHODS.has(method)) return res.status(400).json({ error: "Método inválido" });
  if (typeof name !== "string" || name.trim().length < 2) return res.status(400).json({ error: "Nome inválido" });
  if (!isEmail(email)) return res.status(400).json({ error: "E-mail inválido" });
  if (!isNIF(document)) return res.status(400).json({ error: "NIF inválido (9 dígitos)" });
  if (!isPhone(phone)) return res.status(400).json({ error: "Telemóvel inválido" });

  const { WAYMB_CLIENT_ID, WAYMB_CLIENT_SECRET, WAYMB_ACCOUNT_EMAIL, WAYMB_BASE_URL = "https://api.waymb.com", CALLBACK_URL, SUCCESS_URL, FAILED_URL } = process.env;
  if (!WAYMB_CLIENT_ID || !WAYMB_CLIENT_SECRET || !WAYMB_ACCOUNT_EMAIL) {
    return res.status(500).json({ error: "Credenciais WayMB não configuradas" });
  }

  const payload = {
    client_id: WAYMB_CLIENT_ID,
    client_secret: WAYMB_CLIENT_SECRET,
    account_email: WAYMB_ACCOUNT_EMAIL,
    amount: PLAN_PRICES[plan],
    method,
    payer: { email: email.trim(), name: name.trim(), document: String(document).trim(), phone: String(phone).replace(/\D/g, "") },
    paymentDescription: PLAN_DESCRIPTIONS[plan],
    currency: "EUR",
  };
  if (CALLBACK_URL) payload.callbackUrl = CALLBACK_URL;
  if (SUCCESS_URL) payload.success_url = SUCCESS_URL;
  if (FAILED_URL) payload.failed_url = FAILED_URL;

  console.log("[WayMB /create] REQUEST payload (sem secret):", JSON.stringify({ ...payload, client_secret: "***", client_id: "***" }));

  try {
    const r = await fetch(`${WAYMB_BASE_URL}/transactions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    console.log("[WayMB /create] RESPONSE http=%d body=%s", r.status, text.slice(0, 2000));

    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!r.ok || (data.statusCode && data.statusCode !== 200)) {
      const reason = data.message || data.error || data.errors || data.raw || `HTTP ${r.status}`;
      return res.status(502).json({ error: typeof reason === "string" ? reason : JSON.stringify(reason), gatewayStatus: r.status });
    }

    return res.status(200).json({
      id: data.id || data.transactionID,
      method: data.method,
      amount: data.amount,
      generatedMBWay: data.generatedMBWay === true,
      referenceData: data.referenceData || null,
      createdAt: data.createdAt,
    });
  } catch (err) {
    console.error("[WayMB /create] EXCEPTION:", err);
    return res.status(500).json({ error: "Falha de comunicação com o gateway", message: err?.message || String(err) });
  }
}
