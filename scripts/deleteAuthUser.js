import fs from 'fs';
import os from 'os';
import path from 'path';

async function deleteUserByEmailOrUid(target) {
  if (!target) {
    console.error('Uso: node scripts/deleteAuthUser.js <email-o-uid>');
    process.exit(1);
  }

  const cleanTarget = target.trim().toLowerCase();
  console.log(`Buscando usuario en Firebase Auth: "${cleanTarget}"...`);

  // 1. Obtener token de firebase-tools
  let token = null;
  const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  if (fs.existsSync(configPath)) {
    try {
      const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = conf.tokens?.access_token;
    } catch (e) {
      console.warn('Error leyendo configstore:', e.message);
    }
  }

  if (!token) {
    console.error('No se encontró token activo de Firebase CLI.');
    process.exit(1);
  }

  // 2. Buscar localId si se pasó un email
  let localId = cleanTarget;
  if (cleanTarget.includes('@')) {
    const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/fidelyclub-a70ea/accounts:lookup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: [cleanTarget] })
    });
    const lookupData = await lookupRes.json();
    if (!lookupData.users || lookupData.users.length === 0) {
      console.log(`El usuario "${cleanTarget}" ya no existe en Firebase Auth.`);
      return;
    }
    localId = lookupData.users[0].localId;
    console.log(`Encontrado UID: ${localId} para email ${cleanTarget}`);
  }

  // 3. Eliminar cuenta
  const delRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/fidelyclub-a70ea/accounts:delete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ localId })
  });

  if (delRes.ok) {
    console.log(`¡Usuario con UID ${localId} (${cleanTarget}) eliminado con éxito de Firebase Auth!`);
    return;
  } else {
    const err = await delRes.text();
    console.error('Error al eliminar usuario en Firebase Auth:', err);
    process.exit(1);
  }
}

const targetArg = process.argv[2];
deleteUserByEmailOrUid(targetArg);
