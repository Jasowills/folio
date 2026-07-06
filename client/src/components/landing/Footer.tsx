export default function Footer() {
  const sections = [
    {
      title: 'Product',
      links: ['Resume editor', 'Cover letter', 'ATS scoring', 'Job discovery', 'Interview prep', 'Portfolio analysis'],
    },
    {
      title: 'Resources',
      links: ['Resume examples', 'Cover letter guides', 'Interview tips', 'Blog', 'Help centre'],
    },
    {
      title: 'Company',
      links: ['About', 'Privacy', 'Terms', 'Contact', 'Status'],
    },
  ]

  return (
    <footer className="w-full bg-paper border-t border-border/40">
      <div className="max-w-[1120px] mx-auto px-6 sm:px-8 py-16 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-display text-[20px] text-ink">Folio</span>
            <p className="font-body text-[13px] text-muted mt-2 max-w-[200px] leading-[1.6]">
              The resume platform that does more than look good.
            </p>
          </div>

          {/* Link columns */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="font-body text-[13px] text-ink-light hover:text-ink transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-[12px] text-muted">
            &copy; {new Date().getFullYear()} Folio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
