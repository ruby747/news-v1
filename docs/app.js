/* global React, ReactDOM, dayjs */
(function(){
  // 안전하게 플러그인 확장 (없으면 무시)
  try {
    if (window.dayjs && 'dayjs_plugin_relativeTime' in window) {
      dayjs.extend(window.dayjs_plugin_relativeTime);
      dayjs.locale('ko');
    }
  } catch (e) { console.error('dayjs plugin init error', e); }

  const { useEffect, useMemo, useState } = React;

  function fromNow(ts) { try { return ts ? dayjs(ts).fromNow() : ''; } catch { return ''; } }
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
      React.createElement('div', { className: 'flex items-center justify-center gap-3 p-6 text-neutral-300' },
        React.createElement('svg', { className: 'animate-spin h-5 w-5', viewBox:'0 0 24 24', fill:'none' },
          React.createElement('circle', { className:'opacity-25', cx:12, cy:12, r:10, stroke:'currentColor', strokeWidth:4 }),
          React.createElement('path', { className:'opacity-75', fill:'currentColor', d:'M4 12a8 8 0 018-8v4A4 4 0 008 12H4z' })
        ),
        React.createElement('span', { className:'text-sm' }, label)
      )
    );
  }

  function CanvasWordImage({ word, width=320, height=180, className='' }) {
    const [src, setSrc] = useState(null);
    useEffect(() => {
      try {
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
      } catch (e) {
        console.error('Canvas render failed', e);
      }
    }, [word, width, height]);
    return React.createElement('img', { src: src||'', alt: word, width, height, className });
  }

  function TopicCard({ topic, onClick }) {
    return React.createElement('button', {
      onClick: () => onClick(topic),
      className: 'shrink-0 rounded-2xl overflow-hidden card-shadow border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-600'
    }, React.createElement(CanvasWordImage, { word: topic.token }));
  }

  function ArticleItem({ article }) {
    const [open, setOpen] = useState(false);
    return React.createElement('div', { className:'rounded-2xl border border-neutral-800 p-4 bg-neutral-900/50' },
      React.createElement('div', { className:'flex items-center gap-2' },
        React.createElement('a', { href: article.link, target:'_blank', rel:'noreferrer', className:'font-semibold hover:underline' }, article.title)
      ),
      React.createElement('div', { className:'text-xs text-neutral-400 mt-1' },
        `${article.source} · ${article.publishedAt ? formatKST(article.publishedAt) : ''}`
      ),
      open && article.description ? React.createElement('p', { className:'text-sm text-neutral-200 mt-2' }, article.description) : null,
      React.createElement('div', { className:'mt-3 flex gap-2' },
        React.createElement('a', { href: article.link, target:'_blank', rel:'noreferrer', className:'px-3 py-1.5 text-sm rounded-xl bg-neutral-100 text-neutral-900 hover:bg-white' }, '원문 열기'),
        React.createElement('button', { onClick: () => setOpen(v=>!v), className:'px-3 py-1.5 text-sm rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700' }, open ? '접기' : '요약 보기')
      )
    );
  }

  function Header({ generatedAt, onRefresh }) {
    return React.createElement('div', { className:'sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/80 glass' },
      React.createElement('div', { className:'mx-auto max-w-6xl px-4 py-3 flex items-center gap-3' },
        React.createElement('div', { className:'text-xl font-extrabold tracking-tight' }, 'News Cards'),
        React.createElement('div', { className:'text-xs text-neutral-400 ml-1' },
          generatedAt ? `업데이트: ${fromNow(generatedAt)} · ${formatKST(generatedAt)}` : '—'
        ),
        React.createElement('div', { className:'flex-1' }),
        React.createElement('button', { onClick:onRefresh, className:'px-3 py-1.5 text-sm rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700' }, '새로고침')
      )
    );
  }

  function App() {
    const [state, setState] = useState({ loading: true, error: null, data: null, selected: null });

    const fetchData = async () => {
      try {
        setState(s => ({ ...s, loading: true, error: null }));
        const res = await fetch(`data/latest.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`데이터 로드 실패(${res.status})`);
        const data = await res.json();
        setState({ loading: false, error: null, data, selected: data.topics?.[0] || null });
      } catch (e) {
        // 화면에 바로 표시
        setState(s => ({ ...s, loading: false, error: String(e) }));
        console.error(e);
      }
    };

    useEffect(() => { fetchData(); }, []);

    const relatedArticles = useMemo(() => {
      if (!state.selected || !state.data) return [];
      const ids = state.selected.articleIds || [];
      return ids.map(id => state.data.articlesById[id]).filter(Boolean);
    }, [state.selected, state.data]);

    return React.createElement('div', { className:'mx-auto max-w-6xl px-4 py-4' },
      React.createElement(Header, { generatedAt: state.data?.generatedAt, onRefresh: fetchData }),
      React.createElement('div', { className:'mt-4 space-y-4' },
        React.createElement('div', { className:'flex items-end justify-between' },
          React.createElement('h2', { className:'text-lg font-bold' }, '최신 토픽'),
          React.createElement('div', { className:'text-xs text-neutral-400' }, `${(state.data?.topics?.length || 0)}개 토픽`)
        ),
        state.loading ? React.createElement(Loading) : null,
        state.error ? React.createElement('div', { className:'text-sm text-red-400 border border-red-900 bg-red-950/40 p-4 rounded-xl' }, `데이터를 불러오지 못했습니다: ${state.error}`) : null,
        React.createElement('div', { className:'overflow-x-auto scrollbar-hide' },
          React.createElement('div', { className:'flex gap-4 pr-2' },
            (state.data?.topics || []).map(t =>
              React.createElement('div', { key: t.token, className: (state.selected?.token === t.token ? 'ring-2 ring-white/70 rounded-3xl p-1 -m-1' : '') },
                React.createElement(TopicCard, { topic: t, onClick: (topic) => setState(s => ({ ...s, selected: topic })) })
              )
            )
          )
        ),
        React.createElement('div', { className:'mt-6' },
          React.createElement('div', { className:'flex items-center gap-2' },
            React.createElement('h3', { className:'text-lg font-bold' }, '관련 기사'),
            state.selected ? React.createElement('span', { className:'text-sm text-neutral-400' }, `“${state.selected.token}”`) : null
          ),
          React.createElement('div', { className:'mt-3 grid grid-cols-1 md:grid-cols-2 gap-4' },
            relatedArticles.map(a => React.createElement(ArticleItem, { key: a.id, article: a })),
            (!state.loading && relatedArticles.length === 0)
              ? React.createElement('div', { className:'text-sm text-neutral-400' }, '선택된 토픽의 기사가 아직 없어요.') : null
          )
        )
      ),
      React.createElement('footer', { className:'mt-16 mb-8 text-xs text-neutral-500' },
        '데이터는 GitHub Actions가 공식 RSS에서 생성한 JSON을 사용합니다. 각 소스의 약관과 robots.txt를 준수하세요.'
      )
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();
