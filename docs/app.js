/* global React, ReactDOM, dayjs, dayjs_plugin_relativeTime */
dayjs.extend(dayjs_plugin_relativeTime);
dayjs.locale('ko');

const { useEffect, useMemo, useState } = React;

function fromNow(ts) { return ts ? dayjs(ts).fromNow() : ''; }
function formatKST(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium', timeStyle: 'short', hour12: false, timeZone: 'Asia/Seoul'
    }).format(d);
  } catch { return ts; }
}

function Loading({ label='불러오는 중...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-6 text-neutral-300">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"/>
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function CanvasWordImage({ word, width=320, height=180, className='' }) {
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    const hue = (Array.from(word).reduce((h, ch)=> (h*31 + ch.charCodeAt(0))>>>0, 0) % 360);
    const g = ctx.createLinearGradient(0,0,width,height);
    const c1 = `hsl(${hue} 70% 45%)`;
    const c2 = `hsl(${(hue+40)%360} 70% 35%)`;
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0,0,width,height);
    let size = 56; const maxW = width * 0.9;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'white';
    while (size > 20) {
      ctx.font = `800 ${size}px system-ui, -apple-system, 'Apple SD Gothic Neo','Noto Sans KR', sans-serif`;
      if (ctx.measureText(word).width <= maxW) break;
      size -= 2;
    }
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12;
    ctx.fillText(word, width/2, height/2);
    setSrc(canvas.toDataURL('image/png'));
  }, [word, width, height]);
  return <img src={src||''} alt={word} width={width} height={height} className={className} />;
}

function TopicCard({ topic, onClick }) {
  return (
    <button onClick={() => onClick(topic)}
      className="shrink-0 rounded-2xl overflow-hidden card-shadow border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-600">
      <CanvasWordImage word={topic.token} />
    </button>
  );
}

function ArticleItem({ article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-800 p-4 bg-neutral-900/50">
      <div className="flex items-center gap-2">
        <a href={article.link} target="_blank" rel="noreferrer"
           className="font-semibold hover:underline">{article.title}</a>
      </div>
      <div className="text-xs text-neutral-400 mt-1">
        {article.source} · {article.publishedAt ? formatKST(article.publishedAt) : ''}
      </div>
      {open && article.description && (
        <p className="text-sm text-neutral-200 mt-2">{article.description}</p>
      )}
      <div className="mt-3 flex gap-2">
        <a href={article.link} target="_blank" rel="noreferrer"
           className="px-3 py-1.5 text-sm rounded-xl bg-neutral-100 text-neutral-900 hover:bg-white">원문 열기</a>
        <button onClick={() => setOpen(v=>!v)}
          className="px-3 py-1.5 text-sm rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700">
          {open ? '접기' : '요약 보기'}
        </button>
      </div>
    </div>
  );
}

function Header({ generatedAt, onRefresh }) {
  return (
    <div className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/80 glass">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="text-xl font-extrabold tracking-tight">News Cards</div>
        <div className="text-xs text-neutral-400 ml-1">
          {generatedAt ? <>업데이트: {fromNow(generatedAt)} · {formatKST(generatedAt)}</> : '—'}
        </div>
        <div className="flex-1"></div>
        <button onClick={onRefresh}
          className="px-3 py-1.5 text-sm rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700">새로고침</button>
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState({ loading: true, error: null, data: null, selected: null });

  const fetchData = async () => {
    try {
      setState(s => ({ ...s, loading: true, error: null }));
      const res = await fetch(`data/latest.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('데이터 로드 실패');
      const data = await res.json();
      setState({ loading: false, error: null, data, selected: data.topics?.[0] || null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: String(e) }));
    }
  };

  useEffect(() => { fetchData(); }, []);

  const relatedArticles = useMemo(() => {
    if (!state.selected || !state.data) return [];
    const ids = state.selected.articleIds || [];
    return ids.map(id => state.data.articlesById[id]).filter(Boolean);
  }, [state.selected, state.data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <Header generatedAt={state.data?.generatedAt} onRefresh={fetchData} />

      <div className="mt-4 space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">최신 토픽</h2>
          <div className="text-xs text-neutral-400">{state.data?.topics?.length || 0}개 토픽</div>
        </div>

        {state.loading && <Loading />}
        {state.error && (
          <div className="text-sm text-red-400 border border-red-900 bg-red-950/40 p-4 rounded-xl">
            데이터를 불러오지 못했습니다: {state.error}
          </div>
        )}

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pr-2">
            {(state.data?.topics || []).map(t => (
              <div key={t.token} className={state.selected?.token === t.token ? 'ring-2 ring-white/70 rounded-3xl p-1 -m-1' : ''}>
                <TopicCard topic={t} onClick={(topic)=> setState(s => ({...s, selected: topic}))} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">관련 기사</h3>
            {state.selected && <span className="text-sm text-neutral-400">“{state.selected.token}”</span>}
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map(a => <ArticleItem key={a.id} article={a} />)}
            {!state.loading && relatedArticles.length === 0 && (
              <div className="text-sm text-neutral-400">선택된 토픽의 기사가 아직 없어요.</div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-16 mb-8 text-xs text-neutral-500">
        데이터는 GitHub Actions가 공식 RSS에서 생성한 JSON을 사용합니다. 각 소스의 약관과 robots.txt를 준수하세요.
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
