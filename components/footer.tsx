"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { toast } from "sonner"

export default function Footer() {
  const { language, setLanguage, t } = useLanguage()
  const [email, setEmail] = useState("")
  const year = new Date().getFullYear()

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error(language === "vi" ? "Vui lòng nhập email" : "Please enter your email")
      return
    }
    toast.success(t("footer.subscribeThanks"))
    setEmail("")
  }

  // Gian: link hàng trên ~11–12px, sans, in hoa, tracking rộng
  const linkClass =
    "font-sans text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-black hover:opacity-50 transition-opacity"

  const copyright = t("footer.copyright").replace("{year}", String(year))

  return (
    <footer className="footer border-t border-neutral-200 bg-white font-sans">
      <div className="mx-auto max-w-[1600px] px-5 py-4 md:px-10 md:py-5">
        <div className="ft_cus flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          {/* Trái: nhãn EMAIL xám + gạch chân + SUBSCRIBE (layout Gian) */}
          <form
            onSubmit={handleSubscribe}
            className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-6 lg:max-w-lg"
          >
            <div className="min-w-[140px] flex-1 sm:min-w-[200px]">
              <label
                htmlFor="footer-email"
                className="mb-0.5 block text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-neutral-400"
              >
                {t("footer.emailPlaceholder")}
              </label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full border-0 border-b border-black bg-transparent pb-0.5 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-black placeholder:text-neutral-300 focus:border-black focus:outline-none focus:ring-0"
                placeholder=""
              />
            </div>
            <button
              type="submit"
              className="h-fit shrink-0 self-start border border-black px-4 py-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-black transition-colors hover:bg-black hover:text-white sm:self-end"
            >
              {t("footer.subscribe")}
            </button>
          </form>

          {/* Phải: hàng 1 link (khoảng cách rộng như Gian) — hàng 2 © nhỏ hơn, căn phải */}
          <div className="flex min-w-0 flex-col items-stretch gap-0 lg:items-end">
            <nav className="flex flex-wrap items-baseline justify-start gap-x-5 gap-y-1 sm:gap-x-7 md:gap-x-9 lg:justify-end">
              <span className="inline-flex items-baseline gap-0.5 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-black">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`font-sans transition-opacity ${language === "en" ? "text-black underline decoration-1 underline-offset-4" : "text-black/45 hover:text-black/70"}`}
                >
                  ENG
                </button>
                <span className="text-black/35" aria-hidden>
                  /
                </span>
                <button
                  type="button"
                  onClick={() => setLanguage("vi")}
                  className={`font-sans transition-opacity ${language === "vi" ? "text-black underline decoration-1 underline-offset-4" : "text-black/45 hover:text-black/70"}`}
                >
                  VIE
                </button>
              </span>
              <Link href="/shipping" className={linkClass}>
                {t("footer.returnExchange")}
              </Link>
              <Link href="/privacy" className={linkClass}>
                {t("footer.privacy")}
              </Link>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t("footer.instagram")}
              </a>
              <Link href="/about" className={linkClass}>
                {t("footer.contact")}
              </Link>
            </nav>
            {/* Dòng 2: © — tách hàng trên (không dính sát link) */}
            <p className="mt-2.5 text-right font-sans text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-black lg:mt-2">
              {copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
