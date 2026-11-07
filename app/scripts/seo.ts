// Build step for search engines and link previews (Zalo, Facebook, Messenger… do not run
// JavaScript). From the recipe database it writes, next to the built index.html:
//   recipe/<id>.html, ingredient/<id>.html, explore.html, …  the app page with its own <head>
//     (title, description, canonical, Open Graph, schema.org Recipe) and readable text in <body>
//     that the app replaces when it starts; vercel.json "cleanUrls" serves them at /recipe/<id>.
//   sitemap.xml, robots.txt
// The site address comes from SITE_URL, or on Vercel from VERCEL_PROJECT_PRODUCTION_URL. Without
// one, canonical links and the sitemap are left out (they must be absolute).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import initSqlJs, { type Database } from 'sql.js'
import type { Plugin } from 'vite'

const SITE_NAME = 'AutoRecipt'
const DEFAULT_TITLE = 'AutoRecipt — Hôm nay ăn gì? Gợi ý món nấu từ tủ lạnh'
const DEFAULT_DESCRIPTION =
  'Chọn nguyên liệu nhà bạn có, AutoRecipt gợi ý món Việt, Hàn, Nhật nấu được ngay, kèm công thức từng bước, calo và thực đơn cả tuần.'
const START = '<!-- seo:start -->'
const END = '<!-- seo:end -->'

export function siteUrl(): string {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return raw.replace(/\/+$/, '')
}

interface Page {
  path: string
  title: string
  description: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: object
  body?: string
  /** listed in sitemap.xml */
  index?: boolean
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const minutes = (m: number) => (m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}`)
const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** The tags between the seo markers in index.html. */
export function headTags(page: Page): string {
  const site = siteUrl()
  const abs = (p: string) => (site ? site + p : p)
  const image = abs(page.image ?? '/img/og-image.jpg')
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    site && `<link rel="canonical" href="${esc(abs(page.path))}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    `<meta property="og:locale" content="vi_VN" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    site && `<meta property="og:url" content="${esc(abs(page.path))}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    page.jsonLd && `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}

export const homePage = (): Page => ({
  path: '/',
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  index: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl() || undefined,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    inLanguage: ['vi', 'en'],
    description: DEFAULT_DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
  },
})

function rows<T>(db: Database, sql: string, params: Record<string, string> = {}): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const out: T[] = []
  while (stmt.step()) out.push(stmt.getAsObject() as T)
  stmt.free()
  return out
}

function amountText(amount: number | null, unit: string | null, units: Map<string, string>): string {
  if (amount === null) return ''
  let v = amount
  let u = unit ?? ''
  if (u === 'kg' && v < 1) {
    v *= 1000
    u = 'g'
  }
  const n = String(Math.round(v * 100) / 100)
  if (!u || u === 'piece') return n
  return `${n} ${u === 'g' || u === 'kg' || u === 'ml' ? u : (units.get(u) ?? u)}`
}

interface RecipeRow {
  id: string
  name_vi: string
  name_en: string | null
  description: string | null
  cuisine: string | null
  dish_type: string | null
  servings: number
  prep_min: number | null
  cook_min: number | null
  total_min: number
  kcal: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  fiber_g: number | null
}

function recipePages(db: Database, photos: Record<string, { file: string }>): Page[] {
  const units = new Map(rows<{ id: string; name_vi: string }>(db, 'SELECT id, name_vi FROM units').map((u) => [u.id, u.name_vi]))
  const recipes = rows<RecipeRow>(
    db,
    `SELECT r.id, r.name_vi, r.name_en, r.description, c.name_vi AS cuisine, d.name_vi AS dish_type, r.servings,
            r.prep_min, r.cook_min, r.total_min, n.kcal, n.protein_g, n.fat_g, n.carbs_g, n.fiber_g
       FROM recipes r
       LEFT JOIN cuisines c ON c.id = r.cuisine_id
       LEFT JOIN dish_types d ON d.id = r.dish_type_id
       LEFT JOIN recipe_nutrition n ON n.recipe_id = r.id
      ORDER BY r.id`,
  )
  return recipes.map((r) => {
    const lines = rows<{ name_vi: string; amount: number | null; unit_id: string | null; note: string | null }>(
      db,
      `SELECT i.name_vi, ri.amount, ri.unit_id, ri.note FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = :id ORDER BY ri.position`,
      { ':id': r.id },
    )
    const steps = rows<{ title: string | null; text: string }>(db, 'SELECT title, text FROM recipe_steps WHERE recipe_id = :id ORDER BY step_order', {
      ':id': r.id,
    })
    const tags = rows<{ tag: string }>(db, 'SELECT t.name AS tag FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = :id', { ':id': r.id }).map((t) => t.tag)
    const image = photos[r.id] ? `/img/recipes/${photos[r.id].file}` : undefined
    const ingredients = lines.map((l) => [amountText(l.amount, l.unit_id, units), l.name_vi].filter(Boolean).join(' '))
    const name = r.name_en ? `${r.name_vi} (${r.name_en})` : r.name_vi
    const description = clip(
      `Cách nấu ${r.name_vi}${r.description ? `: ${r.description}` : ''} ${minutes(r.total_min)}, ${Math.round(r.kcal ?? 0)} kcal mỗi phần.`,
    )
    const g = (v: number | null) => `${Math.round(v ?? 0)} g`
    return {
      path: `/recipe/${r.id}`,
      title: `${name} — công thức từng bước | ${SITE_NAME}`,
      description,
      image,
      type: 'article',
      index: true,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: r.name_vi,
        alternateName: r.name_en ?? undefined,
        description: r.description ?? description,
        image: image ? [siteUrl() + image] : undefined,
        author: { '@type': 'Organization', name: SITE_NAME },
        inLanguage: 'vi',
        recipeCuisine: r.cuisine ?? undefined,
        recipeCategory: r.dish_type ?? undefined,
        keywords: tags.join(', ') || undefined,
        recipeYield: `${r.servings}`,
        prepTime: r.prep_min ? `PT${r.prep_min}M` : undefined,
        cookTime: r.cook_min ? `PT${r.cook_min}M` : undefined,
        totalTime: `PT${r.total_min}M`,
        nutrition: r.kcal
          ? {
              '@type': 'NutritionInformation',
              servingSize: '1 phần',
              calories: `${Math.round(r.kcal)} kcal`,
              proteinContent: g(r.protein_g),
              fatContent: g(r.fat_g),
              carbohydrateContent: g(r.carbs_g),
              fiberContent: g(r.fiber_g),
            }
          : undefined,
        recipeIngredient: ingredients,
        recipeInstructions: steps.map((s) => ({ '@type': 'HowToStep', name: s.title ?? undefined, text: s.text })),
      },
      body: [
        `<h1>${esc(r.name_vi)}</h1>`,
        r.name_en ? `<p>${esc(r.name_en)}</p>` : '',
        r.description ? `<p>${esc(r.description)}</p>` : '',
        `<h2>Nguyên liệu (${r.servings} người)</h2><ul>${ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`,
        `<h2>Cách làm</h2><ol>${steps.map((s) => `<li>${s.title ? `<strong>${esc(s.title)}.</strong> ` : ''}${esc(s.text)}</li>`).join('')}</ol>`,
      ].join(''),
    }
  })
}

function ingredientPages(db: Database): Page[] {
  const list = rows<{ id: string; name_vi: string; name_en: string | null }>(
    db,
    'SELECT id, name_vi, name_en FROM ingredients WHERE recipe_count > 0 ORDER BY id',
  )
  return list.map((i) => {
    const dishes = rows<{ id: string; name_vi: string }>(
      db,
      `SELECT DISTINCT r.id, r.name_vi FROM recipe_ingredients ri JOIN recipes r ON r.id = ri.recipe_id
        WHERE ri.ingredient_id = :id ORDER BY r.name_vi`,
      { ':id': i.id },
    )
    const name = i.name_en ? `${i.name_vi} (${i.name_en})` : i.name_vi
    return {
      path: `/ingredient/${i.id}`,
      title: `${name}: cách sơ chế và ${dishes.length} món ngon | ${SITE_NAME}`,
      description: clip(`Cách sơ chế ${i.name_vi} và các món nấu với ${i.name_vi}: ${dishes.map((d) => d.name_vi).join(', ')}.`),
      index: true,
      body: `<h1>${esc(i.name_vi)}</h1><h2>Món ngon với ${esc(i.name_vi)}</h2><ul>${dishes
        .map((d) => `<li><a href="/recipe/${esc(d.id)}">${esc(d.name_vi)}</a></li>`)
        .join('')}</ul>`,
    }
  })
}

const TAB_PAGES: Page[] = [
  {
    path: '/welcome',
    title: `Giới thiệu ${SITE_NAME} — tủ lạnh có gì, nấu ngay món đó`,
    description: DEFAULT_DESCRIPTION,
    index: true,
  },
  {
    path: '/explore',
    title: `Khám phá công thức món Việt, Hàn, Nhật | ${SITE_NAME}`,
    description: 'Tìm món theo tên hoặc nguyên liệu, lọc theo món dễ làm, lành mạnh, dưới 30 phút, cách nấu và nền ẩm thực.',
    index: true,
  },
  {
    path: '/pantry',
    title: `Tủ lạnh nhà bạn có gì? | ${SITE_NAME}`,
    description: 'Chọn nhanh nguyên liệu đang có để xem món nào nấu được ngay và món nào chỉ thiếu 1–2 thứ.',
    index: true,
  },
  {
    path: '/plan',
    title: `Thực đơn cả tuần và danh sách đi chợ | ${SITE_NAME}`,
    description: 'Tự lên mâm cơm cân bằng cho 7 ngày theo mục tiêu calo, rồi tạo danh sách đi chợ.',
    index: true,
  },
]

function sitemap(pages: Page[], lastmod: string): string {
  const site = siteUrl()
  const urls = pages
    .filter((p) => p.index)
    .map((p) => `  <url><loc>${esc(site + p.path)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function robots(): string {
  const site = siteUrl()
  return ['User-agent: *', 'Allow: /', 'Disallow: /cook/', 'Disallow: /profile', site && `\nSitemap: ${site}/sitemap.xml`].filter(Boolean).join('\n') + '\n'
}

const replaceHead = (html: string, page: Page) => {
  const a = html.indexOf(START)
  const b = html.indexOf(END)
  if (a < 0 || b < 0) throw new Error(`index.html needs ${START} … ${END} around the page tags`)
  return html.slice(0, a + START.length) + '\n    ' + headTags(page) + '\n    ' + html.slice(b)
}

export function seo(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'autorecipt-seo',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    // Home page tags, in dev too.
    transformIndexHtml: (html) => replaceHead(html, homePage()),
    async closeBundle() {
      const SQL = await initSqlJs()
      const db = new SQL.Database(readFileSync(join(root, 'public/autorecipt.db')))
      const photos = JSON.parse(readFileSync(join(root, 'public/img/recipes/index.json'), 'utf-8')) as Record<string, { file: string }>
      const builtAt = rows<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'built_at'")[0]?.value ?? new Date().toISOString()
      const pages = [...TAB_PAGES, ...recipePages(db, photos), ...ingredientPages(db)]
      db.close()

      const template = readFileSync(join(outDir, 'index.html'), 'utf-8')
      for (const page of pages) {
        let html = replaceHead(template, page)
        if (page.body) html = html.replace('<div id="root"></div>', `<div id="root"><main class="seo-page">${page.body}</main></div>`)
        const file = join(outDir, `${page.path.slice(1)}.html`)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, html)
      }
      writeFileSync(join(outDir, 'robots.txt'), robots())
      if (siteUrl()) writeFileSync(join(outDir, 'sitemap.xml'), sitemap([homePage(), ...pages], builtAt.slice(0, 10)))
      else this.warn('SITE_URL is not set (Vercel sets VERCEL_PROJECT_PRODUCTION_URL): no sitemap.xml or canonical links')
      console.log(`SEO: ${pages.length} pages${siteUrl() ? ` for ${siteUrl()}` : ''}`)
    },
  }
}
