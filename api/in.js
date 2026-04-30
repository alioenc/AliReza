export const config = { runtime: "edge" };

const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/$/, "");

// هدرهایی که برای امنیت و تمیزی پاسخ حذف می‌شوند
const HEADERS_TO_REMOVE = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-vercel-id",
  "x-vercel-deployment-id",
  "x-vercel-trace",
]);

/**
 * API Gateway Handler
 * 
 * این هندلر درخواست‌های دریافتی را به یک سرویس خارجی منتقل می‌کند
 * و پاسخ را مستقیماً به کاربر برمی‌گرداند.
 */
export default async function handler(req) {
  if (!API_BASE_URL) {
    return new Response(
      JSON.stringify({
        error: "Server Misconfiguration",
        message: "API endpoint is not properly configured.",
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    // استخراج مسیر درخواستی (مثلاً /users/123)
    const url = new URL(req.url);
    const targetPath = url.pathname + url.search;

    // ساخت URL نهایی مقصد
    const targetUrl = `${API_BASE_URL}${targetPath}`;

    // ساخت هدرهای جدید
    const headers = new Headers();

    // کپی هدرهای مجاز از درخواست کاربر
    for (const [key, value] of req.headers) {
      const lowerKey = key.toLowerCase();

      if (HEADERS_TO_REMOVE.has(lowerKey)) continue;
      if (lowerKey.startsWith("x-vercel-")) continue;

      // فقط هدرهای مجاز و استاندارد را نگه می‌داریم
      headers.set(key, value);
    }

    // افزودن اطلاعات مفید برای بک‌اند (بدون افشای اطلاعات حساس)
    headers.set("x-request-id", crypto.randomUUID());

    const method = req.method;
    const hasBody = !["GET", "HEAD", "OPTIONS"].includes(method);

    // ارسال درخواست به سرویس اصلی
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

    // ساخت پاسخ نهایی
    const responseHeaders = new Headers(response.headers);

    // حذف هدرهای حساس از پاسخ
    for (const key of HEADERS_TO_REMOVE) {
      responseHeaders.delete(key);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("API request failed:", error);

    return new Response(
      JSON.stringify({
        error: "Service Unavailable",
        message: "Unable to process your request at this time.",
      }),
      { 
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
