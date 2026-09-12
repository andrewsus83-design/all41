export async function GET() {
  return Response.json({ ok: true, service: "all41-web", at: new Date().toISOString() });
}
