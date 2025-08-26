import { useEffect, useState } from 'react'
import './App.css'

type Hit = {
	id: string
	index: string
	title?: string
	description?: string
	url?: string
	score?: number
}

type Suggestion = { id: string; title: string; url?: string }

type Kpis = { searches: number; clicks: number; ctr: number; zeroRate: number; avgPosition: number }

const API_BASE = ''

function useDebounce<T>(value: T, delay = 250) {
	const [v, setV] = useState(value)
	useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
	return v
}

function App() {
	const [q, setQ] = useState('')
	const [suggestQ, setSuggestQ] = useState('')
	const [type, setType] = useState<'all'|'product'|'article'|'event'>('all')
	const [sort, setSort] = useState<'relevance'|'recent'|'popular'>('relevance')
	const size = 10
	const [hits, setHits] = useState<Hit[]>([])
	const [queryId, setQueryId] = useState('')
	const [sugs, setSugs] = useState<Suggestion[]>([])
	const [sugs2, setSugs2] = useState<Suggestion[]>([])
	const [kpis, setKpis] = useState<Kpis | null>(null)
	const [adv, setAdv] = useState<{ windowMinutes: number; k: number; totalSearches: number; queriesWithClicks: number; mrr: number; ndcg: number } | null>(null)
	const [advMinutes, setAdvMinutes] = useState(10)
	const [advK, setAdvK] = useState(10)
	const dq = useDebounce(q, 200)
	const dqs = useDebounce(suggestQ, 200)

	const products = hits.filter(h => h.index === 'products')
	const articles = hits.filter(h => h.index === 'articles')
	const events = hits.filter(h => h.index === 'events')

	async function fetchSearch() {
		const params = new URLSearchParams({ q, type, sort, page: '1', size: String(size) })
		const res = await fetch(`${API_BASE}/api/search?${params.toString()}`)
		const data = await res.json()
		setHits(data.hits || [])
		setQueryId(data.query_id || '')
	}
	async function fetchAutocomplete() {
		if (!dq) { setSugs([]); return }
		const params = new URLSearchParams({ q: dq, size: '8' })
		const res = await fetch(`${API_BASE}/api/autocomplete/products?${params.toString()}`)
		const data = await res.json()
		setSugs(data.suggestions || [])
	}
	async function fetchSuggest() {
		if (!dqs) { setSugs2([]); return }
		const params = new URLSearchParams({ q: dqs, size: '8' })
		const res = await fetch(`${API_BASE}/api/autocomplete/suggest?${params.toString()}`)
		const data = await res.json()
		setSugs2(data.suggestions || [])
	}
	async function fetchKpis() {
		const res = await fetch(`${API_BASE}/api/metrics/kpis`)
		const data = await res.json()
		setKpis(data)
	}
	async function fetchAdvanced() {
		const params = new URLSearchParams({ minutes: String(advMinutes), k: String(advK) })
		const res = await fetch(`${API_BASE}/api/metrics/advanced?${params.toString()}`)
		const data = await res.json()
		setAdv(data)
	}

	function trackClick(docId: string, rank: number) {
		if (!queryId || !docId) return
		const payload = { query_id: queryId, doc_id: docId, rank, timestamp: Date.now() }
		try {
			if ('navigator' in window && 'sendBeacon' in navigator) {
				const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
				;(navigator as any).sendBeacon(`${API_BASE}/api/analytics/click`, blob)
			} else {
				// fire-and-forget
				fetch(`${API_BASE}/api/analytics/click`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
			}
		} catch {}
	}

	useEffect(() => { fetchKpis() }, [])
	useEffect(() => { fetchAutocomplete() }, [dq])
	useEffect(() => { fetchSuggest() }, [dqs])
	useEffect(() => { fetchSearch() }, [type, sort, size])

	return (
		<div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
			<h2>Descrição do projeto</h2>
			<p>
				Este é um dashboard de busca que utiliza o Elasticsearch para realizar consultas e exibir resultados.<br/>
				Ele inclui funcionalidades de autocomplete, métricas de busca e lista de produtos.<br/>
				Também inclui métricas avançadas como MRR e NDCG.<br/>
			</p>

			<h2>Campo autocomplete</h2>
				<div style={{ position: 'relative' }}>
					<label>Query (products.title com autocomplete)</label><br/>
					<input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar em products.title" onKeyDown={e => { if (e.key === 'Enter') fetchSearch() }} />
					{(sugs.length > 0 && q) && (
						<div style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fff', position: 'absolute', zIndex: 10 }}>
							{sugs.map(s => (
								<div key={s.id} style={{ padding: 8, cursor: 'pointer' }} onClick={() => { setQ(s.title); setSugs([]); fetchSearch() }}>
									{s.title}
								</div>
							))}
						</div>
					)}
				</div>

			<h2>Autocomplete (/suggest) com edge_ngram</h2>
				<div style={{ marginTop: 16 }}>
					<label></label>
					<input value={suggestQ} onChange={e => setSuggestQ(e.target.value)} placeholder="/api/autocomplete/suggest" />
					{(sugs2.length > 0 && suggestQ) && (
						<div style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fff', position: 'absolute', zIndex: 10 }}>
							{sugs2.map(s => (
								<div key={s.id} style={{ padding: 8 }}>
									<a href={s.url || '#'} target="_blank" rel="noreferrer">{s.title}</a>
								</div>
							))}
						</div>
					)}
				</div>

			<h2>Busca dinamica nos index (Products, Articles, Events)</h2>

			<div style={{ display: 'grid', gap: 12, gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
				
				<div>
					<label>Tipo: </label>
					<select value={type} onChange={e => setType(e.target.value as any)}>
						<option value="all">Todos</option>
						<option value="product">Produtos</option>
						<option value="article">Artigos</option>
						<option value="event">Eventos</option>
					</select>
				</div>
				<div>
					<label>Sort</label>
					<select value={sort} onChange={e => setSort(e.target.value as any)}>
						<option value="relevance">Relevância</option>
						<option value="recent">Recentes</option>
						<option value="popular">Populares</option>
					</select>
				</div>
			</div>

			<div style={{ marginTop: 12 }}>
				<button onClick={fetchSearch}>Buscar</button>
			</div>

			<div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr 1fr', marginTop: 24 }}>
				<div>
					<h3>Produtos</h3>
					<ul>{products.map((p, idx) => (
						<li key={p.id}><a onClick={() => trackClick(p.id, idx+1)} href={p.url || '#'} target="_blank" rel="noreferrer">{p.title || p.id}</a></li>
					))}</ul>
				</div>
				<div>
					<h3>Artigos</h3>
					<ul>{articles.map((a, idx) => (
						<li key={a.id}><a onClick={() => trackClick(a.id, idx+1)} href={a.url || '#'} target="_blank" rel="noreferrer">{a.title || a.id}</a></li>
					))}</ul>
				</div>
				<div>
					<h3>Eventos</h3>
					<ul>{events.map((e, idx) => (
						<li key={e.id}><a onClick={() => trackClick(e.id, idx+1)} href={e.url || '#'} target="_blank" rel="noreferrer">{e.title || e.id}</a></li>
					))}</ul>
				</div>
			</div>
		<div style={{ marginTop: 40 }}>
			<h3>Lista de Produtos</h3>
			<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
				<thead>
					<tr style={{ background: '#f5f5f5' }}>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Título</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Descrição</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Categorias</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Tags</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Score de Popularidade</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>URL</th>
						<th style={{ border: '1px solid #ddd', padding: 8 }}>Atualizado em</th>
					</tr>
				</thead>
				<tbody>
					{products.map((prod, idx) => (
						<tr key={prod.id}>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{prod.title || '-'}</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{prod.description || '-'}</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>
								{Array.isArray((prod as any).categories)
									? (prod as any).categories.join(', ')
									: ((prod as any).categories || '-')}
							</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>
								{Array.isArray((prod as any).tags)
									? (prod as any).tags.join(', ')
									: ((prod as any).tags || '-')}
							</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{(prod as any).popularity_score ?? '-'}</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>
								{prod.url ? <a onClick={() => trackClick(prod.id, idx+1)} href={prod.url} target="_blank" rel="noreferrer">{prod.url}</a> : '-'}
							</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>
								{(prod as any).updated_at
									? (() => {
										const d = new Date((prod as any).updated_at);
										const pad = (n: number) => n.toString().padStart(2, '0');
										return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
									})()
									: '-'}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>

		<div style={{ marginTop: 24, padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
				<h3>Métricas Avançadas (MRR / NDCG)</h3>
				<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
					<label>
						Minutos:
						<input type="number" min={1} max={1440} value={advMinutes} onChange={e => setAdvMinutes(Number(e.target.value))} style={{ marginLeft: 6, width: 80 }} />
					</label>
					<label>
						k:
						<input type="number" min={1} max={100} value={advK} onChange={e => setAdvK(Number(e.target.value))} style={{ marginLeft: 6, width: 80 }} />
					</label>
					<button onClick={fetchAdvanced}>Atualizar</button>
				</div>
				{adv && (
					<table style={{ borderCollapse: 'collapse', fontSize: 14 }}>
						<tbody>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>Janela (min)</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.windowMinutes}</td></tr>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>k</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.k}</td></tr>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>Total de Buscas</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.totalSearches}</td></tr>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>Consultas com Clique</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.queriesWithClicks}</td></tr>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>MRR</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.mrr.toFixed(4)}</td></tr>
							<tr><td style={{ border: '1px solid #ddd', padding: 6 }}>NDCG@k</td><td style={{ border: '1px solid #ddd', padding: 6 }}>{adv.ndcg.toFixed(4)}</td></tr>
						</tbody>
					</table>
				)}
			</div>

		<div style={{ marginTop: 40 }}>
			<h3>Métricas de Busca</h3>
			{!kpis ? (
				<p>Carregando métricas...</p>
			) : (
				<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, margin: '0 auto', maxWidth: 500 }}>
					<tbody>
						<tr>
							<td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 500 }}>Total de Buscas</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{kpis.searches}</td>
						</tr>
						<tr>
							<td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 500 }}>Total de Cliques</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{kpis.clicks}</td>
						</tr>
						<tr>
							<td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 500 }}>CTR</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{(kpis.ctr * 100).toFixed(2)}%</td>
						</tr>
						<tr>
							<td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 500 }}>Zero-Result Rate</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{(kpis.zeroRate * 100).toFixed(2)}%</td>
						</tr>
						<tr>
							<td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 500 }}>Posição Média</td>
							<td style={{ border: '1px solid #ddd', padding: 8 }}>{kpis.avgPosition?.toFixed(2) ?? '-'}</td>
						</tr>
					</tbody>
				</table>
			)}
		</div>
		<div style={{ marginTop: 40, padding: 20, border: '1px solid #eee', borderRadius: 8, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
			<h3>Registrar Métricas Manualmente</h3>
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					// Simula o registro de uma busca e clique (mock)
					const form = e.target as HTMLFormElement;
					const clicou = (form.elements.namedItem('clicou') as HTMLInputElement).checked;
					const zero = (form.elements.namedItem('zero') as HTMLInputElement).checked;
					const pos = Number((form.elements.namedItem('posicao') as HTMLInputElement).value);

					// Aqui você pode enviar para um endpoint real de métricas, se existir
					// Exemplo: await fetch('/api/metrics', { method: 'POST', body: JSON.stringify({ busca, clicou, zero, pos }) })

					// Atualiza localmente as métricas para simulação
					setKpis((prev) => {
						if (!prev) return prev;
						const newSearches = prev.searches + 1;
						const newClicks = prev.clicks + (clicou ? 1 : 0);
						const newZero = prev.zeroRate * prev.searches + (zero ? 1 : 0);
						const newAvgPos = prev.avgPosition * prev.searches + (pos || 0);
						return {
							searches: newSearches,
							clicks: newClicks,
							ctr: newSearches > 0 ? newClicks / newSearches : 0,
							zeroRate: newSearches > 0 ? newZero / newSearches : 0,
							avgPosition: newSearches > 0 ? newAvgPos / newSearches : 0,
						};
					});
					form.reset();
				}}
				style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
			>
				<label>
					Termo buscado:
					<input name="busca" type="text" required style={{ marginLeft: 8, padding: 4 }} />
				</label>
				<label>
					Clique realizado?
					<input name="clicou" type="checkbox" style={{ marginLeft: 8 }} />
				</label>
				<label>
					Resultado zero?
					<input name="zero" type="checkbox" style={{ marginLeft: 8 }} />
				</label>
				<label>
					Posição do clique (1 para topo, 0 se não houve clique):
					<input name="posicao" type="number" min="0" max="100" defaultValue="0" style={{ marginLeft: 8, width: 60 }} />
				</label>
				<button type="submit" style={{ marginTop: 8 }}>Registrar Métrica</button>
			</form>
			<p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
				Esses campos simulam o registro de métricas de uso da busca para fins de demonstração.
			</p>
		</div>
		</div>
	)
}

export default App
