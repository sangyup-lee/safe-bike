export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    bike: <><circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9H5m5-9h7l2 9M8 5h4m3-2h3l2 5"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    shield: <><path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/></>,
    route: <><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    cloud: <path d="M6 19a5 5 0 1 1 .8-9.94A6 6 0 0 1 18.5 8a5.5 5.5 0 0 1-.5 11H6Z"/>,
    warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/></>,
    swap: <><path d="M7 3v17m-4-4 4 4 4-4M17 21V4m-4 4 4-4 4 4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    wind: <><path d="M2 8h13a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 16h6a3 3 0 1 1-3 3"/></>,
    layers: <><path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 19l9 5 9-5"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    locate: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    drop: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.pin}</svg>;
}
