"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { IconSearch16 } from "@dhis2/ui-icons";
import { Dhis2Mark, GitHubMark } from "./icons";
import { SoonPill } from "./badges";

interface NavItem {
  href: string;
  label: string;
  soon: boolean;
}

function nav(benchmarksLive: boolean): NavItem[] {
  return [
    { href: "/", label: "Models", soon: false },
    { href: "/benchmarks", label: "Benchmarks", soon: !benchmarksLive },
    { href: "/contribute", label: "Contribute", soon: false },
    { href: "/docs", label: "Docs", soon: false },
  ];
}

function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/models")
    : pathname.startsWith(href);
}

/** Three rules, folding into a cross — the board's own line weight. */
function MenuGlyph({ open }: { open: boolean }) {
  const bar = (y: number, rotate: number | null) => (
    <line
      key={y}
      x1={2.5}
      y1={y}
      x2={17.5}
      y2={y}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="square"
      className="origin-center transition-[transform,opacity] duration-200"
      style={
        open
          ? rotate === null
            ? { opacity: 0 }
            : { transform: `translateY(${10 - y}px) rotate(${rotate}deg)` }
          : undefined
      }
    />
  );
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden>
      {bar(5, 45)}
      {bar(10, null)}
      {bar(15, -45)}
    </svg>
  );
}

/**
 * Below `bar` (900px) the nav collapses behind this button into a
 * full-width sheet under the header: the same four destinations, a search
 * field, and the repo link.
 */
function MobileNav({
  items,
  pathname,
  q,
  setQ,
  onSubmit,
}: {
  items: NavItem[];
  pathname: string;
  q: string;
  setQ: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const [open, setOpen] = useState(false);

  // Any navigation closes the sheet — including back/forward, which the
  // link handlers below never see (state adjusted during render).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Widening past `bar` reveals the real nav bar and hides the sheet with
    // CSS alone — close it so the scroll lock goes with it.
    const desktop = window.matchMedia("(min-width: 900px)");
    const onDesktop = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mp-mobile-nav"
        className="grid h-16 w-16 shrink-0 cursor-pointer place-items-center border-0 bg-transparent text-white hover:bg-white/10 bar:hidden"
      >
        <MenuGlyph open={open} />
      </button>

      {open ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setOpen(false)}
          className="absolute inset-x-0 top-full z-30 h-[100dvh] cursor-default bg-ink/35 bar:hidden"
        />
      ) : null}

      <div
        id="mp-mobile-nav"
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 max-h-[72dvh] overflow-y-auto bg-surface shadow-lift bar:hidden"
      >
        <nav className="flex flex-col px-5 py-2">
          {items.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 border-b border-line py-3.5 text-[16px] last:border-b-0 ${
                  active
                    ? "pl-3 font-medium text-brand-dark [box-shadow:inset_4px_0_0_var(--mp-brand)]"
                    : item.soon
                      ? "text-ink-3"
                      : "text-ink"
                }`}
              >
                {item.label}
                {item.soon ? <SoonPill /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line bg-surface-2 px-5 py-4">
          <form
            onSubmit={(e) => {
              onSubmit(e);
              setOpen(false);
            }}
            className="relative"
          >
            <span className="pointer-events-none absolute left-3 top-3 flex text-ink-3">
              <IconSearch16 />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models"
              aria-label="Search models"
              className="d2-input pl-9 text-[16px]"
            />
          </form>
          <a
            href="https://github.com/dhis2-chap"
            target="_blank"
            rel="noreferrer"
            className="d2-button d2-button-secondary mt-3 w-full"
          >
            <GitHubMark className="h-3.5 w-3.5" />
            Repository
          </a>
        </div>
      </div>
    </>
  );
}

export function Header({ benchmarksLive }: { benchmarksLive: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const items = nav(benchmarksLive);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };
  return (
    <>
      {/* The DHIS2 HeaderBar colour and type, taller than its 48px — this is
          a site, not an app shell. */}
      <header className="sticky top-0 z-40 bg-[#2c6693] text-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 pl-5 sm:px-8 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Dhis2Mark className="h-7 w-auto text-white" />
            <span className="text-[17px] font-medium leading-none">
              Chap Hub
            </span>
          </Link>
          <nav className="hidden h-full items-stretch bar:flex">
            {items.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3.5 text-[15px] transition-colors hover:bg-white/10 ${
                    active ? "font-medium text-white" : "text-white/80"
                  }`}
                >
                  {item.label}
                  {item.soon ? <SoonPill /> : null}
                  {active ? (
                    <span className="absolute inset-x-3 bottom-0 h-[3px] bg-white" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <form onSubmit={submit} className="relative hidden xl:block">
              <span className="pointer-events-none absolute left-3 top-3 flex text-ink-3">
                <IconSearch16 />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search models"
                aria-label="Search models"
                className="d2-input w-[260px] pl-9"
              />
            </form>
            <a
              href="https://github.com/dhis2-chap"
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-2 rounded-[4px] border border-white/40 px-3.5 text-[15px] text-white transition-colors hover:bg-white/10 bar:flex"
            >
              <GitHubMark className="h-4 w-4" />
              Repo
            </a>
            <MobileNav
              items={items}
              pathname={pathname}
              q={q}
              setQ={setQ}
              onSubmit={submit}
            />
          </div>
        </div>
      </header>
    </>
  );
}
