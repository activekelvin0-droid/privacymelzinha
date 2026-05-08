// Vercel Serverless Function — cria pagamento via WayMB
// POST /api/create-payment

const PLAN_PRICES = {
  "3meses": 29.9,
  "1mes": 19.9,
  "12meses": 39.9,
};

const PLAN_DESCRIPTIONS = {
  "3meses": "Subscricao Privacy 3 meses",
  "1mes": "Subscricao Privacy 1 mes",
  "12meses": "Subscricao Privacy 12 meses",
};

const ALLOWED_METHODS = new Set(["mbway", "multibanco"]);

function isValidEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isValidNIF(s) {
  return typeof s === "string" && /^\d{9}$/.test(s);
}
function isValidPhone(s) {
  return typeof s === "string" && /^\d{9,15}$/.test(s.replace(/\D/g, ""));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const { plan, method, name, email, phone } = body;
  const document = body.document;

  if (!plan || !PLAN_PRICES[plan]) {
    return res.status(400).json({ error: "Plano inválido" });
  }
  if (!method || !ALLOWED_METHODS.has(method)) {
    return res.status(400).json({ error: "Método de pagamento inválido" });
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Nome inválido" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "E-mail inválido" });
  }
  if (!isValidNIF(document)) {
    return res.status(400).json({ error: "NIF inválido (9 dígitos)" });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "Telemóvel inválido" });
  }

  const {
    WAYMB_CLIENT_ID,
    WAYMB_CLIENT_SECRET,
    WAYMB_ACCOUNT_EMAIL,
    WAYMB_BASE_URL = "https://api.waymb.com",
    CALLBACK_URL,
    SUCCESS_URL,
    FAILED_URL,
  } = process.env;

  if (!WAYMB_CLIENT_ID || !WAYMB_CLIENT_SECRET || !WAYMB_ACCOUNT_EMAIL) {
    return res.status(500).json({
      error:
        "Credenciais WayMB não configuradas no servidor (WAYMB_CLIENT_ID, WAYMB_CLIENT_SECRET, WAYMB_ACCOUNT_EMAIL).",
    });
  }

  const amount = PLAN_PRICES[plan];

  const waymbPayload = {
    client_id: WAYMB_CLIENT_ID,
    client_secret: WAYMB_CLIENT_SECRET,
    account_email: WAYMB_ACCOUNT_EMAIL,
    amount,
    method,
    payer: {
      email: email.trim(),
      name: name.trim(),
      document: String(document).trim(),
      phone: String(phone).replace(/\D/g, ""),
    },
    paymentDescription: PLAN_DESCRIPTIONS[plan],
    currency: "EUR",
  };
  if (CALLBACK_URL) waymbPayload.callbackUrl = CALLBACK_URL;
  if (SUCCESS_URL) waymbPayload.success_url = SUCCESS_URL;
  if (FAILED_URL) waymbPayload.failed_url = FAILED_URL;

  try {
    const upstream = await fetch(`${WAYMB_BASE_URL}/transactions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(waymbPayload),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || (data.statusCode && data.statusCode !== 200)) {
      return res.status(502).json({
        error: data.message || "Erro ao criar pagamento no gateway",
        status: upstream.status,
      });
    }

    // Devolve apenas os campos necessários ao frontend (nada de credenciais)
    return res.status(200).json({
      id: data.id || data.transactionID,
      method: data.method,
      amount: data.amount,
      generatedMBWay: data.generatedMBWay === true,
      referenceData: data.referenceData || null,
      createdAt: data.createdAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Falha de comunicação com o gateway",
      message: err && err.message ? err.message : String(err),
    });
  }
}
