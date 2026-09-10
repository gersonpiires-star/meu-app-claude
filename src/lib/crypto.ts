import crypto from "crypto";

const ALGORITMO = "aes-256-gcm";

function chave(): Buffer {
  const base64 = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!base64) throw new Error("CREDENTIALS_ENCRYPTION_KEY não configurada");
  const buf = Buffer.from(base64, "base64");
  if (buf.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY precisa decodificar pra 32 bytes (gere com o comando do .env.example)");
  }
  return buf;
}

// Criptografia simétrica pra credenciais de contas de terceiros (ex: senha
// da UniTV) — diferente do token do Mercado Pago (guardado em texto puro
// hoje), essas são a senha de verdade de uma conta externa: vazar dá acesso
// total à conta, não só a ações dentro de um escopo de API. IV aleatório a
// cada chamada; formato guardado no banco é "iv.tag.dados", tudo base64.
export function criptografar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, chave(), iv);
  const dados = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), dados.toString("base64")].join(".");
}

export function descriptografar(valor: string): string {
  const [ivB64, tagB64, dadosB64] = valor.split(".");
  if (!ivB64 || !tagB64 || !dadosB64) throw new Error("Valor criptografado em formato inválido");
  const decipher = crypto.createDecipheriv(ALGORITMO, chave(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dados = Buffer.concat([decipher.update(Buffer.from(dadosB64, "base64")), decipher.final()]);
  return dados.toString("utf8");
}
