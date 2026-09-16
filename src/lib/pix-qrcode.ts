import QRCode from "qrcode";

// Separado de lib/pix.ts de propósito: só o servidor precisa gerar a
// imagem do QR code, então só esse arquivo carrega a dependência "qrcode"
// (evita ela ir pro bundle do cliente sem necessidade).
export async function gerarQrCodePix(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}
