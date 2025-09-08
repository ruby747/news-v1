/* global React, ReactDOM, dayjs, dayjs_plugin_relativeTime */
dayjs.extend(dayjs_plugin_relativeTime);
dayjs.locale('ko');

const { useEffect, useMemo, useState } = React;

function hashInt(str) { // stable pseudo random for a string
  let h=0; for (let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return h>>>0;
}
function unsplashByQuery(q, w=960, h=540) {
  const sig = (Date.now()/(1000*60*60)|0) + hashInt(q); // rotate hourly per query
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(q)}&sig=${sig}`;
}
function fromNow(ts) { return ts ? dayjs(ts).fromNow() : ''; }
function formatKST(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat('ko-KR', { dateStyle:'medium', timeStyle:'short', hour12:false, timeZone:'Asia/Seoul' }).format(d);
  } catch { return ts; }
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
          className="px-3 py-1.5 text-sm rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700">
          새로고침
        </button>
      </div>
    </div>
  );
}

function TopicCard({ topic, getImage, onClick }) {
  const [imgSrc, setImgSrc] = useState(getImage(topic));
  useEffect(() => { setImgSrc(getImage(topic)); }, [topic, getImage]);
  const fallback = (e) => { e.currentTarget.src = unsplashByQuery(topic.token); };
  return (
    <button onClick={() => onClick(topic)}
      className="group relative rounded-3xl overflow-hidden card-shadow border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-600">
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <img src={imgSrc} onError={fallback}
             alt={topic.token}
             className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-2xl md:text-3xl font-extrabold leading-tight drop-shadow">
            {topic.token}
          </div>
          <div className="mt-1 text-xs text-neutral-300">{topic.score}개 기사</div>
        </div>
      </div>
    </button>
  );
}

function ArticleItem({ article }) {
  return (
    <div className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-900/60">
      {article.image && (
        <img src={article.image} alt="" className="w-full h-40 object-cover" />
      )}
      <div className="p-3">
        <a href={article.link} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{article.title}</a>
        <div className="text-xs text-neutral-400 mt-1">{article.source} · {article.publishedAt ? formatKST(article.publishedAt) : ''}</div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="absolute inset-x-0 top-10 mx-auto max-w-4xl w-[92%] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 card-shadow">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="font-bold">{title}</div>
          <button onClick={onClose} className="px-2 py-1 text-sm rounded-lg bg-neutral-800 border border-neutral-700">닫기</button>
        </div>
        <div className="p-4">{children}</div>
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
      setState({ loading: false, error: null, data, selected: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: String(e) }));
    }
  };
  useEffect(() => { fetchData(); }, []);

  const getImage = React.useCallback((topic) => {
    // pick first article image if available, else Unsplash by query
    if (!state.data) return unsplashByQuery(topic.token);
    const ids = topic.articleIds || [];
    for (const id of ids) {
      const a = state.data.articlesById[id];
      if (a?.image) return a.image;
    }
    return unsplashByQuery(topic.token);
  }, [state.data]);

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

        {state.loading && <div className="p-8 text-center text-neutral-400">불러오는 중…</div>}
        {state.error && (
          <div className="text-sm text-red-400 border border-red-900 bg-red-950/40 p-4 rounded-xl">
            데이터를 불러오지 못했습니다: {state.error}
          </div>
        )}

        {/* Topics-first: 큰 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(state.data?.topics || []).map(t => (
            <TopicCard key={t.token} topic={t} getImage={getImage} onClick={(topic)=> setState(s => ({...s, selected: topic}))} />
          ))}
        </div>

        {/* 기사 목록은 모달로만 보여줌 */}
        <Modal open={!!state.selected} onClose={()=> setState(s => ({...s, selected: null}))}
               title={state.selected ? `“${state.selected.token}” 관련 기사` : ''}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map(a => <ArticleItem key={a.id} article={a} />)}
            {!state.loading && relatedArticles.length === 0 && (
              <div className="text-sm text-neutral-400">선택된 토픽의 기사가 아직 없어요.</div>
            )}
          </div>
        </Modal>
      </div>

      <footer className="mt-16 mb-8 text-xs text-neutral-500">
        데이터는 GitHub Actions가 공식 RSS에서 생성한 JSON을 사용합니다. 각 소스의 약관과 robots.txt를 준수하세요.
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
