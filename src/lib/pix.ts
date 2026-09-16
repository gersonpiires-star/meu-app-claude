// Gera o payload "Pix Copia e Cola" (BR Code, padrão EMVCo usado pelo Pix) a
// partir de uma chave já cadastrada — sem depender de nenhuma API externa
// (Mercado Pago, banco, etc), então funciona mesmo pro revendedor que só
// tem uma chave Pix cadastrada e nunca configurou pagamento online.
// Referência do formato: manual "BR Code" do Banco Central. Sem
// dependências (nem "qrcode", ver lib/pix-qrcode.ts) de propósito — esse
// arquivo é importado também de componentes client (mensagem de cobrança).

function tlv(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, "0")}${valor}`;
}

// Nome/cidade no Pix só aceitam A-Z, 0-9 e espaço — sem acento, sem
// caractere especial. Maiúsculo é convenção (não obrigatório), mas evita
// banco recusar por caractere fora da faixa ASCII permitida.
function normalizarTexto(valor: string, tamanhoMaximo: number): string {
  const semAcento = valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "");
  return (semAcento.trim() || "GESTORPRO").slice(0, tamanhoMaximo);
}

// A chave salva em ChavePix.valor está como a pessoa digitou — o Pix exige
// formato exato por tipo (só dígitos em CPF/CNPJ, E.164 em telefone).
function normalizarChave(tipo: string, valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (tipo === "CPF" || tipo === "CNPJ") return digitos;
  if (tipo === "Telefone") return digitos.length <= 11 ? `+55${digitos}` : `+${digitos}`;
  return valor.trim();
}

// CRC-16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF) — checksum exigido
// no fim de todo BR Code, calculado sobre o próprio payload já com o
// campo "6304" (id + tamanho do CRC) no final, mas sem o valor do CRC.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPixCopiaCola({
  tipo,
  chave,
  nomeRecebedor,
  cidade,
  valor,
  identificador,
}: {
  tipo: string;
  chave: string;
  nomeRecebedor: string;
  cidade?: string;
  valor?: number;
  identificador?: string;
}): string {
  const merchantAccountInfo = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", normalizarChave(tipo, chave));

  const semCrc =
    tlv("00", "01") + // Payload Format Indicator
    tlv("26", merchantAccountInfo) + // Merchant Account Information — Pix
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986") + // Moeda: Real (ISO 4217)
    (valor && valor > 0 ? tlv("54", valor.toFixed(2)) : "") + // Valor — omitido = cliente digita
    tlv("58", "BR") +
    tlv("59", normalizarTexto(nomeRecebedor, 25)) +
    tlv("60", normalizarTexto(cidade ?? "BRASIL", 15)) +
    tlv("62", tlv("05", (identificador || "***").slice(0, 25))) +
    "6304"; // id + tamanho do campo CRC, valor calculado a seguir

  return semCrc + crc16(semCrc);
}
