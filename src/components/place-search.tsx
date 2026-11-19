"use client";
import { useEffect, useId, useState } from "react";
import type { Place } from "@/lib/demo-data";
import Icon from "./icon";

export default function PlaceSearch({ label, place, onChange }: { label: string; place: Place; onChange: (p: Place) => void }) {
  const id = useId();
  const [query, setQuery] = useState(place.name);
  const [open, setOpen] = useState(false);
  const [previous, setPrevious] = useState(place.name);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ query: string; places: Place[]; error: string } | null>(null);
  if (previous !== place.name) { setPrevious(place.name); setQuery(place.name); }
  const search = query.trim();
  useEffect(() => {
    if (!open || !search) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(search)}`, { signal: abort.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "장소 검색에 실패했습니다.");
        if (body.meta?.isDemo !== false || !Array.isArray(body.data?.places)) throw new Error("실제 장소 검색 결과를 확인하지 못했습니다.");
        if (!abort.signal.aborted) setResult({ query: search, places: body.data.places, error: "" });
      } catch (error) {
        if (!abort.signal.aborted) setResult({ query: search, places: [], error: error instanceof Error ? error.message : "장소 검색 연결에 실패했습니다." });
      }
    }, 300);
    return () => { abort.abort(); window.clearTimeout(timer); };
  }, [open, search]);
  const current = result?.query === search ? result : null;
  const results = current?.places ?? [];
  function close() { setOpen(false); setQuery(place.name); setActive(-1); }
  function select(value: Place) { onChange(value); setQuery(value.name); setOpen(false); setActive(-1); }
  return <div className="place-search">
    <label><span className={`field-dot ${label === "목적지" ? "destination" : ""}`}/><span className="sr-only">{label}</span><input role="combobox" aria-autocomplete="list" value={query} placeholder={`${label} 검색`} aria-label={`${label} 검색`} aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 && results[active] ? `${id}-${active}` : undefined} autoComplete="off" maxLength={80} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setActive(-1); setOpen(true); }} onKeyDown={(e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((n) => results.length ? (n + 1) % results.length : -1); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((n) => results.length ? (n <= 0 ? results.length - 1 : n - 1) : -1); }
      if (e.key === "Enter" && open) { e.preventDefault(); if (results.length) select(results[active >= 0 ? active : 0]); }
    }}/><Icon name="search" size={17}/></label>
    {open && <><button type="button" className="search-dismiss" aria-label="검색 닫기" onClick={close}/><div className="search-results" id={`${id}-results`} role="listbox" aria-label={`${label} 장소 검색 결과`}><p>카카오 장소 검색 · 서울 지역</p>{!search ? <div className="empty-search">검색할 장소 이름을 입력해 주세요.</div> : !current ? <div className="empty-search" role="status">장소를 검색하고 있습니다…</div> : current.error ? <div className="empty-search" role="alert">{current.error}</div> : results.length ? results.map((p, index) => <button type="button" role="option" aria-selected={active >= 0 ? active === index : place.id === p.id} id={`${id}-${index}`} key={p.id} className={active === index ? "active-option" : ""} onClick={() => select(p)}><Icon name="pin" size={18}/><span><strong>{p.name}</strong><small>{p.address}</small></span></button>) : <div className="empty-search" role="status">일치하는 장소가 없습니다. 검색어를 바꿔 주세요.</div>}</div></>}
  </div>;
}
