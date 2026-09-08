import QRCode from "qrcode";

export async function toQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    color: { dark: "#0c0d10", light: "#eef0f4" },
    errorCorrectionLevel: "M",
  });
}
