/** Lets the team "install" their check-in link on their phone's home screen (it opens like an app). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{20,100}$/.test(token)) return new Response("Not found", { status: 404 });
  const manifest = {
    name: "2A Construction – site check-in", short_name: "2A Site", id: `/crew/${token}`,
    start_url: `/crew/${token}`, scope: "/crew/", display: "standalone", orientation: "portrait",
    background_color: "#0a0a0a", theme_color: "#071a33",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, max-age=3600" } });
}
