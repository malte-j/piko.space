import { ImageResponse } from "@vercel/og";

export const OPEN_GRAPH_IMAGE_VERSION = "v2";

function titleForDisplay(title: string): string {
  const value = title.replace("\uE000", " ");
  return value.length > 70 ? `${value.slice(0, 69)}…` : value;
}

async function loadAsset(env: Env, requestUrl: string, path: string): Promise<ArrayBuffer> {
  const response = await env.ASSETS.fetch(new URL(path, requestUrl));
  if (!response.ok) throw new Error(`Unable to load OG asset: ${path}`);
  return response.arrayBuffer();
}

export async function renderOpenGraphImage(
  env: Env,
  requestUrl: string,
  title: string,
): Promise<Response> {
  const [inter, emoji] = await Promise.all([
    loadAsset(env, requestUrl, "/og/Inter-Medium.otf"),
    loadAsset(env, requestUrl, "/og/NotoColorEmoji-Regular.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "Inter",
        backgroundColor: "#f6f4f7",
        backgroundImage: "linear-gradient(135deg, #e8e3fa 0%, #f6f4f7 52%, #f7e0f5 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "absolute",
          top: "225px",
          color: "#2C0140",
          fontSize: "44px",
        }}
      >
        <svg width="62" height="54" viewBox="0 0 34 30" fill="none">
          <path d="M10.5 5C10.5 8.03757 8.03757 10.5 5 10.5C8.03757 10.5 10.5 12.9624 10.5 16C10.5 12.9624 12.9624 10.5 16 10.5C12.9624 10.5 10.5 8.03757 10.5 5Z" fill="#2C0140" />
          <path d="M21.5 8C21.5 12.1421 18.1421 15.5 14 15.5C18.1421 15.5 21.5 18.8579 21.5 23C21.5 18.8579 24.8579 15.5 29 15.5C24.8579 15.5 21.5 12.1421 21.5 8Z" fill="#2C0140" />
          <path d="M12.5 18C12.5 19.933 10.933 21.5 9 21.5C10.933 21.5 12.5 23.067 12.5 25C12.5 23.067 14.067 21.5 16 21.5C14.067 21.5 12.5 19.933 12.5 18Z" fill="#2C0140" />
        </svg>
        <div style={{ display: "flex", marginLeft: "10px" }}>piko.space</div>
      </div>
      <div
        style={{
          display: "flex",
          width: "860px",
          justifyContent: "center",
          textAlign: "center",
          color: "#2C0140",
          fontSize: "56px",
          marginTop: "150px",
        }}
      >
        {titleForDisplay(title)}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      emoji: "noto",
      fonts: [
        { name: "Inter", data: inter, weight: 500, style: "normal" },
        { name: "Emoji", data: emoji, weight: 400, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
