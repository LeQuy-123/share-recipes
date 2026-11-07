// Keeps <title>, the description and the canonical link in step with the screen, for browser
// tabs, history and search engines that run JavaScript. The build writes the same tags into
// static pages for crawlers and link previews that do not (scripts/seo.ts).
import { useEffect } from 'react'

const SITE = 'AutoRecipt'
const HOME_TITLE = 'Hôm nay ăn gì? Gợi ý món nấu từ tủ lạnh | AutoRecipt'

function setMeta(selector: string, attr: string, value: string) {
  document.querySelector(selector)?.setAttribute(attr, value)
}

/** `title` null = the home title. `description` is kept as is when not given. */
export function usePageMeta(title: string | null, description?: string | null) {
  useEffect(() => {
    const full = title ? `${title} | ${SITE}` : HOME_TITLE
    document.title = full
    setMeta('meta[property="og:title"]', 'content', full)
    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
    }
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.setAttribute('href', new URL(window.location.pathname, canonical.getAttribute('href') ?? window.location.href).href)
  }, [title, description])
}
