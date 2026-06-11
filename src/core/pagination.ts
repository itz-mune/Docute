// Page switching: Next/Previous buttons or continuous scroll.
// Works in both content modes — SPA (hash hrefs) and multi (.html hrefs).

import { NavNode } from './scanner'
import { homeIcon } from './theme'

export interface PageRef {
    slug: string
    title: string
}

export type ContentMode = 'spa' | 'multi'

// href for a page, depending on content mode
function href(slug: string, mode: ContentMode): string {
    return mode === 'spa' ? `#${slug}` : `${slug}.html`
}

// flattens the nav tree (depth-first, in sidebar order) into a linear page list
export function flattenNav(nodes: NavNode[]): PageRef[] {
    const out: PageRef[] = []
    for (const node of nodes) {
        if (node.children) {
            out.push(...flattenNav(node.children))
        } else if (node.path) {
            out.push({ slug: node.path, title: node.label })
        }
    }
    return out
}

// Prev/Next footer for buttons mode.
// Next is filled (primary); Prev is bordered (secondary).
// On the last page, Next becomes "Back to Home".
export function buildPaginationFooter(
    pages: PageRef[],
    index: number,
    mode: ContentMode
): string {
    if (pages.length === 0) return ''

    const prev = index > 0 ? pages[index - 1] : null
    const isLast = index === pages.length - 1
    const next = !isLast ? pages[index + 1] : null
    const first = pages[0]

    const prevBtn = prev
        ? `<a class="page-nav-btn page-nav-prev" href="${href(prev.slug, mode)}">← ${prev.title}</a>`
        : `<span class="page-nav-spacer"></span>`

    const nextBtn = isLast
        ? `<a class="page-nav-btn page-nav-home" href="${href(first.slug, mode)}">${homeIcon}<span>Back to Home</span></a>`
        : `<a class="page-nav-btn page-nav-next" href="${href(next!.slug, mode)}">${next!.title} →</a>`

    return `
      <footer class="page-nav">
        ${prevBtn}
        ${nextBtn}
      </footer>`
}

// SPA buttons mode: one section visible at a time, switched by hash.
export function spaButtonsScript(): string {
    return `<script>
  const allSections = document.querySelectorAll('.spa-section')

  function showSection(id) {
    let found = false
    allSections.forEach(section => {
      const match = section.id === id
      section.style.display = match ? 'block' : 'none'
      if (match) found = true
    })
    if (!found && allSections.length) allSections[0].style.display = 'block'
    window.scrollTo({ top: 0 })
  }

  function setActiveLink(id) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id)
    })
  }

  function handleHash() {
    const id = window.location.hash.slice(1) || (allSections[0] && allSections[0].id)
    showSection(id)
    setActiveLink(id)
  }

  window.addEventListener('hashchange', handleHash)
  handleHash()
</script>`
}

// SPA scroll mode: all sections stacked; smooth-scroll nav; loops to top at the end.
export function spaScrollScript(): string {
    return `<script>
  const sections = Array.from(document.querySelectorAll('.spa-section'))

  // smooth scroll for nav + footer links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.getElementById(link.getAttribute('href').slice(1))
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth' })
        history.pushState(null, '', link.getAttribute('href'))
      }
    })
  })

  // highlight the section currently in view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id)
        })
      }
    })
  }, { rootMargin: '-45% 0px -45% 0px' })
  sections.forEach(s => observer.observe(s))

  // loop: scrolling down past the very bottom glides back to the top
  let looping = false
  window.addEventListener('wheel', e => {
    if (looping || e.deltaY <= 0) return
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2
    if (atBottom) {
      looping = true
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => { looping = false }, 800)
    }
  }, { passive: true })
</script>`
}

// Multi scroll mode: scrolling past the bottom advances to the next page
// (or loops back to the first from the last one).
export function multiScrollScript(nextHref: string): string {
    return `<script>
  let advancing = false
  window.addEventListener('wheel', e => {
    if (advancing || e.deltaY <= 0) return
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2
    if (atBottom) {
      advancing = true
      window.location.href = ${JSON.stringify(nextHref)}
    }
  }, { passive: true })
</script>`
}
