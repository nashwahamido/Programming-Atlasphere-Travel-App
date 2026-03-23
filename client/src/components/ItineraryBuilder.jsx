/**
 * ItineraryBuilder.jsx
 * ─────────────────────────────────────────────────────────────────────────────
]
 *   LEFT:   Monthly calendar — click days to select range
 *   CENTER: Weekly schedule — hourly time slots, drag-drop targets
 *   RIGHT:  Activities panel — draggable items from recommendations
 */

import React, { useState, useCallback } from 'react';
import '../styles/itinerary-builder.css';

const HOURS = ['08.00','09.00','10.00','11.00','12.00','13.00','14.00','15.00','16.00','17.00','18.00','19.00','20.00','21.00','22.00','23.00','00.00','01.00','02.00'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const defaultActivities = [
  { id: 'a1', name: 'Prague', desc: 'Haha oh man', emoji: '🔥', time: '12m', color: '#3B5F8A' },
  { id: 'a2', name: 'Rome', desc: 'woohoooo', time: '24m', color: '#E8933A' },
  { id: 'a3', name: 'Dublin', desc: "Haha that's terrifying", emoji: '😂', time: '1h', color: '#3B5F8A' },
  { id: 'a4', name: 'Colosseum', desc: 'Haha oh man', emoji: '🔥', time: '12m', color: '#3B5F8A' },
  { id: 'a5', name: 'Pantheon', desc: 'woohoooo', time: '24m', color: '#E8933A' },
  { id: 'a6', name: "Saint Peter's Basilica", desc: "Haha that's terrifying", emoji: '😄', time: '1h', color: '#3B5F8A' },
];

const ItineraryBuilder = ({ tripId = null, onSave = null }) => {
  // ── Calendar state ────────────────────────────────────────────────────────
  const [calYear, setCalYear] = useState(2021);
  const [calMonth, setCalMonth] = useState(1); // Feb
  const [rangeStart, setRangeStart] = useState(23);
  const [rangeEnd, setRangeEnd] = useState(27);
  const [picking, setPicking] = useState(false);

  // ── Week state ────────────────────────────────────────────────────────────
  const weekDays = [
    { num: 18, label: 'Mo' }, { num: 19, label: 'Tu' }, { num: 20, label: 'Wed' },
    { num: 21, label: 'Th' }, { num: 22, label: 'Fr' }, { num: 23, label: 'Sa' }, { num: 24, label: 'Su' },
  ];
  const [activeDay, setActiveDay] = useState(21);

  // ── Schedule state ────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState({
    '08.00': { id: 's1', text: 'Rapat dengan Bruce Wayne' },
    '13.00': { id: 's2', text: 'Test wawasan kebangasaan di Dusun Wakanda' },
  });

  // ── Panel state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState('recommend');

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragInfo, setDragInfo] = useState(null);
  const [overSlot, setOverSlot] = useState(null);

  // ── Calendar logic ────────────────────────────────────────────────────────
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(calYear, calMonth, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const cells = firstDay + daysInMonth;
  const overflow = cells % 7 === 0 ? 0 : 7 - (cells % 7);

  const goPrev = () => calMonth === 0 ? (setCalMonth(11), setCalYear(calYear - 1)) : setCalMonth(calMonth - 1);
  const goNext = () => calMonth === 11 ? (setCalMonth(0), setCalYear(calYear + 1)) : setCalMonth(calMonth + 1);

  const clickDay = (d) => {
    if (!picking) { setRangeStart(d); setRangeEnd(d); setPicking(true); }
    else { const s = Math.min(rangeStart, d); const e = Math.max(rangeStart, d); setRangeStart(s); setRangeEnd(e); setPicking(false); }
  };

  const dayClass = (d) => {
    if (d === rangeStart) return 'ib-cal__day ib-cal__day--start';
    if (d === rangeEnd) return 'ib-cal__day ib-cal__day--end';
    if (d > rangeStart && d < rangeEnd) return 'ib-cal__day ib-cal__day--range';
    return 'ib-cal__day';
  };

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

    if (dragInfo.type === 'panel') {
      setBlocks(prev => ({ ...prev, [timeKey]: { id: 'sb-' + Date.now(), text: dragInfo.name } }));
    } else if (dragInfo.type === 'block') {
      setBlocks(prev => {
        const n = { ...prev };
        if (dragInfo.from) delete n[dragInfo.from];
        n[timeKey] = { id: dragInfo.id, text: dragInfo.text };
        return n;
      });
    }
    setDragInfo(null);
  }, [dragInfo]);

  const removeBlock = (k) => setBlocks(prev => { const n = { ...prev }; delete n[k]; return n; });

  // ── Filter activities ─────────────────────────────────────────────────────
  const filtered = defaultActivities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.desc.toLowerCase().includes(search.toLowerCase())
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
        <div className="ib-week">
          {weekDays.map(d => (
            <div key={d.num} className={`ib-week__day${activeDay === d.num ? ' ib-week__day--active' : ''}`}
              onClick={() => setActiveDay(d.num)}>
              <span className="ib-week__num">{d.num}</span>
              <span className="ib-week__label">{d.label}</span>
            </div>
          ))}
        </div>
        <h4 className="ib-schedule__title">Schedule Today</h4>
        <div className="ib-timeslots">
          {HOURS.map(h => (
            <div key={h} className="ib-timerow">
              <span className="ib-timerow__label">{h}</span>
              <div className={`ib-timerow__slot${overSlot === h ? ' ib-timerow__slot--over' : ''}`}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDragEnter={e => { e.preventDefault(); setOverSlot(h); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverSlot(null); }}
                onDrop={e => slotDrop(e, h)}>
                {blocks[h] && (
                  <div className="ib-block" draggable onDragStart={e => blockDragStart(e, h, blocks[h])}>
                    <span className="ib-block__text">{blocks[h].text}</span>
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
            onClick={() => setPanelMode('recommend')}>Recommend</button>
          <button className={`ib-panel__tog${panelMode === 'recent' ? ' ib-panel__tog--on' : ''}`}
            onClick={() => setPanelMode('recent')}>Recent</button>
        </div>
        <input className="ib-panel__search" type="text" placeholder="search activities"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="ib-panel__list">
          {filtered.map(a => (
            <div key={a.id} className="ib-act" draggable onDragStart={e => panelDragStart(e, a)}>
              <div className="ib-act__icon" style={{ backgroundColor: a.color }}></div>
              <div className="ib-act__info">
                <div className="ib-act__name">{a.name}</div>
                <div className="ib-act__desc">{a.desc} {a.emoji || ''}</div>
              </div>
              <span className="ib-act__time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ItineraryBuilder;