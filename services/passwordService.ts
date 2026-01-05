// Serviço para hash e verificação de senhas usando Web Crypto API

/**
 * Gera um hash SHA-256 da senha com salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Gerar salt aleatório
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combinar senha com salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);

  // Gerar hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Retornar hash + salt (para poder verificar depois)
  return `${hashHex}:${saltHex}`;
}

/**
 * Verifica se a senha corresponde ao hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const [hash, salt] = hashedPassword.split(":");
    if (!hash || !salt) {
      return false;
    }

    // Combinar senha fornecida com salt armazenado
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);

    // Gerar hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparar hashes
    return hashHex === hash;
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    return false;
  }
}

/**
 * Gera uma senha provisória aleatória
 */
export function generateTemporaryPassword(): string {
  const length = 8;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((x) => charset[x % charset.length])
    .join("");
}
