import React, { useState, useCallback, useMemo, useEffect } from 'react';
import '../styles/itinerary-builder.css';

const HOURS = ['08.00','09.00','10.00','11.00','12.00','13.00','14.00','15.00','16.00','17.00','18.00','19.00','20.00','21.00','22.00','23.00','00.00','01.00','02.00'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const defaultActivities = [];

const ItineraryBuilder = ({ tripId = null, groupId = null, onSave = null, tripDays = 7, isActive = false }) => {
  const today = new Date();
  const storageKey = 'itinerary-' + (tripId || 'default');

  // Activities loaded from vote API
  const [upvotedActivities, setUpvotedActivities] = useState([]);
  const [savedActivities, setSavedActivities] = useState([]);

  // Re-fetch whenever tab becomes active or groupId changes
  useEffect(() => {
    var gid = groupId || tripId;
    if (!gid || !isActive) return;

    fetch('/api/votes/saved?groupId=' + gid + '&type=upvote')
      .then(r => r.json())
      .then(data => {
        setUpvotedActivities((data || []).map((v, i) => ({
          id: v.activityId || ('up-' + i),
          name: v.activityName,
          desc: (v.activityTags || '').split(',').filter(Boolean).join(', '),
          color: '#3B5F8A',
          image: v.activityImage
        })));
      })
      .catch(() => {});

    fetch('/api/votes/saved?groupId=' + gid + '&type=bookmark')
      .then(r => r.json())
      .then(data => {
        setSavedActivities((data || []).map((v, i) => ({
          id: v.activityId || ('bk-' + i),
          name: v.activityName,
          desc: (v.activityTags || '').split(',').filter(Boolean).join(', '),
          color: '#E8933A',
          image: v.activityImage
        })));
      })
      .catch(() => {});
  }, [groupId, tripId, isActive]);

  // ── Calendar state (persisted) ────────────────────────────────────────────
  const [calYear, setCalYear] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-calYear');
    return saved ? parseInt(saved) : today.getFullYear();
  });

  const [calMonth, setCalMonth] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-calMonth');
    return saved ? parseInt(saved) : today.getMonth();
  });

  const [rangeStart, setRangeStart] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-rangeStart');
    return saved ? parseInt(saved) : null;
  });

  const [rangeEnd, setRangeEnd] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-rangeEnd');
    return saved ? parseInt(saved) : null;
  });

  // ── Week state (persisted) ────────────────────────────────────────────────
  const [activeDay, setActiveDay] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-activeDay');
    return saved ? parseInt(saved) : 0;
  });

  // Build week days dynamically from selected range
  const weekDays = useMemo(() => {
    if (!rangeStart) return [];
    return Array.from({ length: tripDays }, (_, i) => {
      const date = new Date(calYear, calMonth, rangeStart + i);
      return {
        index: i,
        num: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        label: DAY_NAMES[date.getDay()]
      };
    });
  }, [rangeStart, tripDays, calYear, calMonth]);

  // ── Schedule state (persisted) ────────────────────────────────────────────
  const [allBlocks, setAllBlocks] = useState(() => {
    const saved = localStorage.getItem(storageKey + '-blocks');
    return saved ? JSON.parse(saved) : {};
  });

  const dayBlocks = allBlocks[activeDay] || {};

  // ── Panel state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState('recommend');

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragInfo, setDragInfo] = useState(null);
  const [overSlot, setOverSlot] = useState(null);

  // ── Persist all state to localStorage ────────────────────────────────────
  useEffect(() => {
    if (rangeStart !== null) {
      localStorage.setItem(storageKey + '-rangeStart', rangeStart);
      localStorage.setItem(storageKey + '-rangeEnd', rangeEnd);
      localStorage.setItem(storageKey + '-calYear', calYear);
      localStorage.setItem(storageKey + '-calMonth', calMonth);
    }
  }, [rangeStart, rangeEnd, calYear, calMonth]);

  useEffect(() => {
    localStorage.setItem(storageKey + '-blocks', JSON.stringify(allBlocks));
  }, [allBlocks]);

  useEffect(() => {
    localStorage.setItem(storageKey + '-activeDay', activeDay);
  }, [activeDay]);

  // ── Calendar logic ────────────────────────────────────────────────────────
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(calYear, calMonth, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const cells = firstDay + daysInMonth;
  const overflow = cells % 7 === 0 ? 0 : 7 - (cells % 7);

  const goPrev = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const goNext = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const clickDay = (d) => {
    const end = Math.min(d + tripDays - 1, daysInMonth);
    const hasActivities = Object.values(allBlocks).some(day => Object.keys(day).length > 0);

    if (rangeStart !== null && hasActivities) {
      const confirmed = window.confirm(
        'Changing your start date will clear all your planned activities. Are you sure?'
      );
      if (!confirmed) return;
    }

    setRangeStart(d);
    setRangeEnd(end);
    setActiveDay(0);
    setAllBlocks({});
    localStorage.removeItem(storageKey + '-blocks');
    localStorage.removeItem(storageKey + '-activeDay');
  };

  // Check which day indices have scheduled activities
  const daysWithBlocks = useMemo(() => {
    var result = {};
    for (var dayIdx in allBlocks) {
      if (Object.keys(allBlocks[dayIdx]).length > 0) {
        result[dayIdx] = true;
      }
    }
    return result;
  }, [allBlocks]);

  // Map a calendar date to its day index (0-based from rangeStart)
  const dateToDayIndex = (d) => {
    if (rangeStart === null || d < rangeStart || d > rangeEnd) return -1;
    return d - rangeStart;
  };

  const dayClass = (d) => {
    if (rangeStart === null) return 'ib-cal__day';
    var cls = 'ib-cal__day';
    if (d === rangeStart) cls += ' ib-cal__day--start';
    else if (d === rangeEnd) cls += ' ib-cal__day--end';
    else if (d > rangeStart && d < rangeEnd) cls += ' ib-cal__day--range';
    // Add indicator if this day has activities
    var idx = dateToDayIndex(d);
    if (idx >= 0 && daysWithBlocks[idx]) cls += ' ib-cal__day--has-plans';
    return cls;
  };

  // Current active day label for schedule title
  const activeDayInfo = weekDays[activeDay];
  const scheduleTitle = activeDayInfo
    ? `${MONTHS[activeDayInfo.month]} ${activeDayInfo.num} (Day ${activeDay + 1})`
    : 'Schedule';

  // ── Drag from panel ───────────────────────────────────────────────────────
  const panelDragStart = (e, act) => {
    setDragInfo({ type: 'panel', name: act.name, id: act.id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', act.id);
  };

  // ── Drag from schedule ────────────────────────────────────────────────────
  const blockDragStart = (e, timeKey, block) => {
    setDragInfo({ type: 'block', id: block.id, text: block.text, from: timeKey });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  };

  // ── Drop on slot ──────────────────────────────────────────────────────────
  const slotDrop = useCallback((e, timeKey) => {
    e.preventDefault();
    setOverSlot(null);
    if (!dragInfo) return;

    setAllBlocks(prev => {
      const dayData = { ...(prev[activeDay] || {}) };
      if (dragInfo.type === 'panel') {
        dayData[timeKey] = { id: 'sb-' + Date.now(), text: dragInfo.name };
      } else if (dragInfo.type === 'block') {
        if (dragInfo.from) delete dayData[dragInfo.from];
        dayData[timeKey] = { id: dragInfo.id, text: dragInfo.text };
      }
      return { ...prev, [activeDay]: dayData };
    });
    setDragInfo(null);
  }, [dragInfo, activeDay]);

  const removeBlock = (k) => setAllBlocks(prev => {
    const dayData = { ...(prev[activeDay] || {}) };
    delete dayData[k];
    return { ...prev, [activeDay]: dayData };
  });

  // ── Filter activities ─────────────────────────────────────────────────────
  const currentActivities = panelMode === 'recommend' ? upvotedActivities : savedActivities;
  const filtered = currentActivities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.desc || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ib-layout">

      {/* ═══ LEFT: Calendar ═══ */}
      <div className="ib-calendar">
        <div className="ib-cal__header">
          <h3 className="ib-cal__title">{MONTHS[calMonth]} {calYear}</h3>
          <div className="ib-cal__arrows">
            <button className="ib-cal__arrow" onClick={goPrev}>&lsaquo;</button>
            <button className="ib-cal__arrow" onClick={goNext}>&rsaquo;</button>
          </div>
        </div>
        {rangeStart ? (
          <p className="ib-cal__hint">
            Trip: {MONTHS[calMonth]} {rangeStart} – {rangeEnd} ({tripDays} days)
          </p>
        ) : (
          <p className="ib-cal__hint">Click a start date to highlight your {tripDays}-day trip</p>
        )}
        <div className="ib-cal__grid">
          {DAY_LABELS.map(d => <div key={d} className="ib-cal__head">{d}</div>)}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={'p' + i} className="ib-cal__day ib-cal__day--other">{prevDays - firstDay + 1 + i}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => (
            <div key={i + 1} className={dayClass(i + 1)} onClick={() => clickDay(i + 1)}>{i + 1}</div>
          ))}
          {Array.from({ length: overflow }, (_, i) => (
            <div key={'n' + i} className="ib-cal__day ib-cal__day--other">{i + 1}</div>
          ))}
        </div>
      </div>

      {/* ═══ CENTER: Schedule ═══ */}
      <div className="ib-schedule">
        {weekDays.length > 0 ? (
          <div className="ib-week">
            {weekDays.map((d, i) => (
              <div key={i}
                className={`ib-week__day${activeDay === i ? ' ib-week__day--active' : ''}${daysWithBlocks[i] ? ' ib-week__day--has-plans' : ''}`}
                onClick={() => setActiveDay(i)}>
                <span className="ib-week__num">{d.num}</span>
                <span className="ib-week__label">{d.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="ib-week" style={{ justifyContent: 'center', opacity: 0.5, fontSize: 13, padding: '12px 0' }}>
            Select a start date on the calendar
          </div>
        )}
        <h4 className="ib-schedule__title">{scheduleTitle}</h4>
        <div className="ib-timeslots">
          {HOURS.map(h => (
            <div key={h} className="ib-timerow">
              <span className="ib-timerow__label">{h}</span>
              <div className={`ib-timerow__slot${overSlot === h ? ' ib-timerow__slot--over' : ''}`}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDragEnter={e => { e.preventDefault(); setOverSlot(h); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverSlot(null); }}
                onDrop={e => slotDrop(e, h)}>
                {dayBlocks[h] && (
                  <div className="ib-block" draggable onDragStart={e => blockDragStart(e, h, dayBlocks[h])}>
                    <span className="ib-block__text">{dayBlocks[h].text}</span>
                    <button className="ib-block__x" onClick={() => removeBlock(h)}>&times;</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT: Activities ═══ */}
      <div className="ib-panel">
        <div className="ib-panel__toggles">
          <button className={`ib-panel__tog${panelMode === 'recommend' ? ' ib-panel__tog--on' : ''}`}
            onClick={() => setPanelMode('recommend')}>Upvoted</button>
          <button className={`ib-panel__tog${panelMode === 'recent' ? ' ib-panel__tog--on' : ''}`}
            onClick={() => setPanelMode('recent')}>Saved</button>
        </div>
        <input className="ib-panel__search" type="text" placeholder="search activities"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="ib-panel__list">
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ib-text-muted, #888)', fontSize: '13px' }}>
              <p style={{ marginBottom: '8px' }}>No activities yet</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Upvoted and saved activities from recommendations will appear here</p>
            </div>
          )}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ib-text-muted, #888)', fontSize: '13px' }}>
              <p style={{ marginBottom: '8px' }}>No activities yet</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Upvoted and saved activities from recommendations will appear here</p>
            </div>
          )}
          {filtered.map(a => (
            <div key={a.id} className="ib-act" draggable onDragStart={e => panelDragStart(e, a)}>
              <div className="ib-act__icon" style={{ backgroundColor: a.color, overflow: 'hidden' }}>
                {a.image && <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />}
              </div>
              <div className="ib-act__info">
                <div className="ib-act__name">{a.name}</div>
                <div className="ib-act__desc">{a.desc || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ItineraryBuilder;