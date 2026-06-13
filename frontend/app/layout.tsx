// app/layout.tsx — root layout with Amazon-style nav bar

import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Amazon ReRoute",
  description: "AI-powered returns marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ─── Nav bar ──────────────────────────────────────────── */}
        <nav style={navStyles.nav}>
          <div style={navStyles.inner}>
            {/* Logo */}
            <Link href="/" style={navStyles.logo}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>amazon</span>
              <span style={{ color: "#ff9900", fontWeight: 900, fontSize: 18 }}>.in</span>
              <span
                style={{
                  marginLeft: 6,
                  background: "#ff9900",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                ReRoute
              </span>
            </Link>

            {/* Nav links */}
            <div style={navStyles.links}>
              <NavLink href="/">Return Center</NavLink>
              <NavLink href="/deals">ReRoute Deals</NavLink>
              <NavLink href="/relist">ReList C2C</NavLink>
            </div>

            {/* Right side placeholder */}
            <div style={{ color: "#ccc", fontSize: 12 }}>
              [Demo Mode — Hardcoded Personas]
            </div>
          </div>
        </nav>

        {/* ─── Page content ──────────────────────────────────────── */}
        <main>{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color: "#fff",
        padding: "4px 10px",
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid transparent",
      }}
    >
      {children}
    </Link>
  );
}

const navStyles: Record<string, React.CSSProperties> = {
  nav: { background: "#131921", padding: "0 16px" },
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 20,
    height: 50,
  },
  logo: { textDecoration: "none", display: "flex", alignItems: "center" },
  links: { display: "flex", gap: 4, flex: 1 },
};
