export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || ''
  return /WhatsApp|FBAN|FBAV|Instagram|Line\/|Twitter|Telegram|Snapchat/i.test(ua)
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent || '')
}

/** Link que força a abertura no Chrome fora do WebView do WhatsApp. */
export function chromeIntentUrl(): string {
  const url = new URL(window.location.href)
  const fallback = encodeURIComponent(url.toString())
  const path = `${url.host}${url.pathname}${url.search}${url.hash}`
  return `intent://${path}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}
