export const handler = async () => {
  const url = process.env.GOOGLE_SHEETS_URL;
  if (!url) return { statusCode: 500, body: JSON.stringify({ error: 'GOOGLE_SHEETS_URL no configurada.' }) };
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
    const text = await response.text();
    return { statusCode: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' }, body: text };
  } catch (error) {
    return { statusCode: 502, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Error al consultar catálogo.' }) };
  }
};
