// Utilidades de validación y prevención de duplicados para Socios fidely CLUB

/**
 * Normaliza una cédula o documento de identidad eliminando puntos, guiones y espacios.
 * Ejemplo: "V- 18.456.789" -> "v18456789"
 */
export function normalizeDocId(docId) {
  if (!docId) return '';
  return docId.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extrae solo los dígitos de la cédula para comparar "V18456789" con "18456789".
 */
export function extractDocDigits(docId) {
  if (!docId) return '';
  const clean = normalizeDocId(docId);
  return clean.replace(/^[vepj]/g, '');
}

/**
 * Normaliza un correo electrónico a minúsculas sin espacios.
 */
export function normalizeEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

/**
 * Normaliza números de teléfono (Venezuela y formato internacional):
 * - Elimina caracteres no numéricos.
 * - Quita el código de país 58 inicial si existe (ej. 584121234567 -> 4121234567).
 * - Quita el cero de discado nacional inicial (ej. 04121234567 -> 4121234567).
 * Permite comparar: "+58 412 1234567", "0412-1234567" y "4121234567" como el mismo número.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let digits = phone.toString().replace(/\D/g, '');
  if (digits.startsWith('58') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Verifica si los datos de un nuevo cliente ya existen en la base de datos de socios.
 * Valida unicidad estricta para:
 * 1. Cédula / Documento de Identidad (RN-01)
 * 2. Correo Electrónico
 * 3. Teléfono Celular
 * 
 * @param {Object} candidate - { docId, email, phone, name }
 * @param {Array} existingClients - Lista actual de socios registrados
 * @returns {{ isDuplicate: boolean, field?: 'docId' | 'email' | 'phone', message?: string, existingClient?: Object }}
 */
export function checkDuplicateClient(candidate, existingClients = []) {
  if (!candidate || !Array.isArray(existingClients) || existingClients.length === 0) {
    return { isDuplicate: false };
  }

  const candDoc = normalizeDocId(candidate.docId);
  const candDocDigits = extractDocDigits(candidate.docId);
  const candEmail = normalizeEmail(candidate.email);
  const candPhone = normalizePhone(candidate.phone);

  for (const client of existingClients) {
    // 1. Validar unicidad de Cédula / Documento
    if (candDoc && client.docId) {
      const existingDoc = normalizeDocId(client.docId);
      const existingDocDigits = extractDocDigits(client.docId);

      const exactMatch = candDoc === existingDoc;
      const digitsMatch = (candDocDigits.length >= 6 && candDocDigits === existingDocDigits);

      if (exactMatch || digitsMatch) {
        return {
          isDuplicate: true,
          field: 'docId',
          message: `Esta cédula (${candidate.docId}) ya se encuentra registrada a nombre de ${client.name}.`,
          existingClient: client
        };
      }
    }

    // 2. Validar unicidad de Correo Electrónico
    if (candEmail && client.email) {
      const existingEmail = normalizeEmail(client.email);
      if (candEmail === existingEmail) {
        return {
          isDuplicate: true,
          field: 'email',
          message: `El correo electrónico "${candidate.email}" ya está registrado para el socio ${client.name}.`,
          existingClient: client
        };
      }
    }

    // 3. Validar unicidad de Teléfono Celular
    if (candPhone && candPhone.length >= 7 && client.phone) {
      const existingPhone = normalizePhone(client.phone);
      if (existingPhone && candPhone === existingPhone) {
        return {
          isDuplicate: true,
          field: 'phone',
          message: `El número de teléfono "${candidate.phone}" ya está asociado a la cuenta de ${client.name}.`,
          existingClient: client
        };
      }
    }
  }

  return { isDuplicate: false };
}
