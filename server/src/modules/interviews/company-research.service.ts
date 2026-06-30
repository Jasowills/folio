import { Injectable, Logger } from '@nestjs/common'
import { chromium } from 'playwright'

export interface CompanyResearchData {
  name: string
  mission: string | null
  values: string[]
  recentNews: string | null
  productFocus: string | null
  interviewStyleSignal: string
}

@Injectable()
export class CompanyResearchService {
  private readonly logger = new Logger(CompanyResearchService.name)

  async research(url: string): Promise<CompanyResearchData> {
    this.logger.log(`Researching company at ${url}`)
    const defaults: CompanyResearchData = {
      name: '',
      mission: null,
      values: [],
      recentNews: null,
      productFocus: null,
      interviewStyleSignal: '',
    }

    let browser
    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

      const title = await page.title()
      const text = await page.innerText('body')

      defaults.name = this.extractCompanyName(title, url)
      defaults.mission = this.extractMission(text)
      defaults.values = this.extractValues(text)
      defaults.productFocus = this.extractProductFocus(text)
      defaults.recentNews = this.extractRecentNews(text)
      defaults.interviewStyleSignal = this.extractInterviewStyle(text)

      this.logger.log(`Research complete for ${defaults.name}`)
      return defaults
    } catch (err) {
      this.logger.error(`Company research failed for ${url}: ${(err as Error).message}`)
      return defaults
    } finally {
      if (browser) await browser.close()
    }
  }

  private extractCompanyName(title: string, url: string): string {
    const fromTitle = title.split(/[-|–—]/)[0]?.trim()
    if (fromTitle && fromTitle.length < 50) return fromTitle
    try {
      return new URL(url).hostname.replace('www.', '').split('.')[0]
    } catch {
      return ''
    }
  }

  private extractMission(text: string): string | null {
    const patterns = [
      /mission[:\s]+([^.!?\n]{10,200})/i,
      /our mission is to\s+([^.!?\n]{10,200})/i,
      /(?:we\s+(?:aim|strive|exist)\s+to\s+[^.!?\n]{10,200})/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1] || match[0]
    }
    return null
  }

  private extractValues(text: string): string[] {
    const values: string[] = []
    const patterns = [
      /(?:our\s+)?values[:\s]+([^.!?\n]{10,300})/i,
      /(?:core\s+)?values[:\s]+([^.!?\n]{10,300})/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const words = match[1].split(/[,•·\n]+/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 40)
        values.push(...words.slice(0, 8))
      }
    }
    const valueKeywords = ['integrity', 'innovation', 'customer', 'excellence', 'collaboration', 'diversity', 'inclusion', 'sustainability', 'transparency', 'accountability', 'respect', 'teamwork']
    for (const keyword of valueKeywords) {
      if (text.toLowerCase().includes(keyword) && !values.some((v) => v.toLowerCase().includes(keyword))) {
        values.push(keyword.charAt(0).toUpperCase() + keyword.slice(1))
      }
    }
    return [...new Set(values)].slice(0, 6)
  }

  private extractProductFocus(text: string): string | null {
    const patterns = [
      /(?:our\s+)?(?:product|platform|solution)[:\s]+([^.!?\n]{10,200})/i,
      /we (?:build|create|develop|offer)[\s]+([^.!?\n]{10,200})/i,
      /what we do[:\s]+([^.!?\n]{10,200})/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  private extractRecentNews(text: string): string | null {
    const patterns = [
      /(?:latest\s+)?news[:\s]+([^.!?\n]{20,300})/i,
      /announce[ds][^.!?\n]{20,200}/i,
      /launch(?:ed|ing)[^.!?\n]{20,200}/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[0]
    }
    return null
  }

  private extractInterviewStyle(text: string): string {
    const lower = text.toLowerCase()
    if (lower.includes('culture') || lower.includes('values') || lower.includes('mission')) return 'culture-forward'
    if (lower.includes('innovative') || lower.includes('cutting-edge') || lower.includes('technology')) return 'innovation-focused'
    if (lower.includes('customer') || lower.includes('client')) return 'client-centric'
    if (lower.includes('fast-paced') || lower.includes('startup')) return 'fast-paced'
    if (lower.includes('traditional') || lower.includes('established') || lower.includes('heritage')) return 'traditional'
    return 'professional'
  }
}
