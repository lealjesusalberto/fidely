/**
 * Utilidades para detección de navegadores móviles y escapes de visores restringidos (In-App Browsers)
 */

export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|Snapchat|Bytedance|TikTok|MicroMessenger/i.test(ua) ||
    (/wv/.test(ua) && isAndroid())
  );
}

export function isChromeOnAndroid() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return isAndroid() && /Chrome/i.test(ua) && !/SamsungBrowser|MiuiBrowser|HuaweiBrowser|Opera|OPR|Edge|EdgA/i.test(ua);
}

export function isSafariOnIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return isIOS() && /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua) && !isInAppBrowser();
}

/**
 * Genera el enlace de protocolo Android Intent para forzar la apertura de Google Chrome
 */
export function getChromeIntentUrl(targetUrl = null) {
  const current = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const noProtocol = current.replace(/^https?:\/\//i, '');
  return `intent://${noProtocol}#Intent;scheme=https;package=com.android.chrome;end`;
}

/**
 * Intenta abrir la URL actual en la app nativa de Google Chrome en Android
 */
export function openInChromeApp(targetUrl = null) {
  if (!isAndroid()) return false;
  try {
    const intentUrl = getChromeIntentUrl(targetUrl);
    window.location.href = intentUrl;
    return true;
  } catch (e) {
    console.warn('[BrowserDetection] No se pudo lanzar Intent de Chrome:', e);
    return false;
  }
}

