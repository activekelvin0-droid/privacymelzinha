// Vercel Serverless Function — recebe notificações da WayMB
// POST /api/webhook
// Configure este URL no campo `callbackUrl` (variável CALLBACK_URL)
//
// Estrutura do payload (ver docs WayMB → Webhook):
// {
//   statusCode: 200,
//   message: "Payment processed successfully",
//   transactionId: "...",   // nota: capital "I" apenas (diferente do /create que usa "transactionID")
//   id: "...",              // mesmo valor
//   amount: 100.50,
//   value: 100.50,          // === amount
//   currency: "EUR",
//   status: "PENDING" | "COMPLETED" | "DECLINED",
//   updatedAt: 1712861310,
//   email: "...",
//   account_email: "...",
//   payer: { email, name, document }
// }
//
// IMPORTANTE: a doc exige resposta 200 sempre que a notificação chegar,
// mesmo que a nossa lógica falhe (caso contrário a WayMB reenvia).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    // TODO: validar `signature` do payload contra um segredo partilhado
    // assim que a WayMB documentar como assina os webhooks.

    console.log("[WayMB webhook]", JSON.stringify(body));

    // Pontos onde podes ligar a tua lógica de negócio:
    //
    // const { id, transactionId, status, amount, currency, payer, account_email } = body;
    // const txId = id || transactionId;
    //
    // switch (status) {
    //   case "COMPLETED":
    //     // libertar acesso, enviar email, marcar lead como cliente
    //     // ex: await sendWelcomeEmail(payer.email, payer.name, txId);
    //     break;
    //   case "DECLINED":
    //     // registar tentativa falhada
    //     break;
    //   case "PENDING":
    //     // raro receber via webhook (geralmente já vem no /create)
    //     break;
    // }
  } catch (err) {
    // Nunca propagar para 5xx — registar e seguir.
    console.error("[WayMB webhook] erro a processar:", err);
  }

  // Sempre 200, conforme exigência da doc WayMB.
  return res.status(200).json({ received: true });
}
