import QRCode from "qrcode";

export async function toQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    color: { dark: "#050806", light: "#0AE39C" },
    errorCorrectionLevel: "M",
  });
}
