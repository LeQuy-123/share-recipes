import { useStore } from '../store'
import { MAIN_APP } from '../router'

export function Dashboard() {
  const { state, label } = useStore()
  if (!state) return null
  const r = state.recipes
  const count = <K extends string>(key: (x: (typeof r)[number]) => K) => {
    const m = new Map<K, number>()
    for (const x of r) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const byCuisine = count((x) => x.cuisine)
  const byStars = [1, 2, 3, 4, 5].map((n) => [n, r.filter((x) => x.difficulty === n).length] as const)
  const maxStars = Math.max(...byStars.map(([, c]) => c), 1)
  const noImage = r.filter((x) => !x.has_image).length
  const noRefs = r.filter((x) => !x.references).length
  const usedNoNutrition = state.ingredients.filter((i) => i.used_in && !i.has_nutrition).length
  const unused = state.ingredients.filter((i) => !i.used_in).length

  return (
    <div className="page">
      <h1>Tổng quan</h1>
      <div className="cards">
        <a className="stat" href="#/recipes">
          <strong>{r.length}</strong> công thức
        </a>
        <a className="stat" href="#/ingredients">
          <strong>{state.ingredients.length}</strong> nguyên liệu
        </a>
        <a className={`stat${state.warnings ? ' warn' : ''}`} href="#/check">
          <strong>{state.warnings}</strong> cảnh báo khi build
        </a>
        <a className={`stat${noImage ? ' info' : ''}`} href="#/recipes?noimage">
          <strong>{noImage}</strong> món chưa có ảnh
        </a>
        <a className={`stat${noRefs ? ' warn' : ''}`} href="#/check">
          <strong>{noRefs}</strong> món chưa có nguồn
        </a>
        <a className={`stat${usedNoNutrition ? ' warn' : ''}`} href="#/check">
          <strong>{usedNoNutrition}</strong> nguyên liệu dùng nhưng thiếu dinh dưỡng
        </a>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Theo ẩm thực</h2>
          <table className="mini">
            <tbody>
              {byCuisine.map(([c, n]) => (
                <tr key={c}>
                  <td>{label('cuisines', c)}</td>
                  <td className="num">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Theo độ khó</h2>
          <div className="bars">
            {byStars.map(([n, c]) => (
              <div key={n} className="bar-row">
                <span>{'★'.repeat(n)}</span>
                <span className="bar">
                  <span style={{ width: `${(c / maxStars) * 100}%` }} />
                </span>
                <span className="num">{c}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Cách cập nhật app chính</h2>
        <ol className="howto">
          <li>Sửa công thức, nguyên liệu hoặc danh mục rồi bấm <b>Lưu</b>.</li>
          <li>Server kiểm tra và build lại cơ sở dữ liệu; nếu lỗi thì không có gì bị thay đổi.</li>
          <li>
            Bản mới được xuất bản ngay vào <code>app/public/autorecipt.db</code>. App chính (
            <a href={MAIN_APP} target="_blank" rel="noreferrer">
              {MAIN_APP}
            </a>
            ) sẽ hiện thông báo “Có dữ liệu mới” để tải lại.
          </li>
          <li>
            Bản cũ của mỗi file đã sửa được lưu trong <code>.admin-backups/</code>.
          </li>
        </ol>
        <p className="muted">
          Build gần nhất: {state.built_at ?? '—'} · {unused} nguyên liệu chưa dùng trong công thức nào
        </p>
      </section>
    </div>
  )
}
