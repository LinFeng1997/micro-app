// source/link.ts
import type {
  AppInterface,
  sourceLinkInfo,
} from '@micro-app/types'
import { fetchSource } from './fetch'
import {
  CompletionPath,
  pureCreateElement,
  defer,
  logError,
} from '../libs/utils'
import scopedCSS from './scoped_css'
import {
  dispatchOnLoadEvent,
  dispatchOnErrorEvent,
} from './load_event'

// Global links, reuse across apps
export const globalLinks = new Map<string, string>()

export class LinkParser {
  private static instance: LinkParser;
  public static getInstance (): LinkParser {
    if (!this.instance) {
      this.instance = new LinkParser()
    }
    return this.instance
  }

  public static formatDynamicLink = formatDynamicLink;
  public static fetchLinkSuccess = fetchLinkSuccess;

  /**
   * Extract link elements
   * @param link link element
   * @param parent parent element of link
   * @param app app
   * @param microAppHead micro-app-head element
   * @param isDynamic dynamic insert
   */
  public extractLinkFromHtml (
    link: HTMLLinkElement,
    parent: Node,
    app: AppInterface,
  ): any {
    let { rel, href } = this.getLinkAttr(link)

    let replaceComment: Comment | null = null
    if (this.isStylesheet(rel) && href) {
      href = CompletionPath(href, app.url)
      replaceComment = document.createComment(`link element with href=${href} move to micro-app-head as style element`)
      app.source.links.set(href, {
        code: '',
        placeholder: replaceComment,
        isGlobal: link.hasAttribute('global'),
      })
    } else if (this.isOtherRel(rel)) {
      parent.removeChild(link)
    } else if (href) {
      // dns-prefetch preconnect modulepreload search ....
      link.setAttribute('href', CompletionPath(href, app.url))
    }

    if (replaceComment) {
      return parent.replaceChild(replaceComment, link)
    }
  }

  /**
   * Extract dynamic link elements
   * @param link link element
   * @param url link url
   */
  public extractDynamicLinkFromHtml (
    link: HTMLLinkElement,
    url: string,
  ): any {
    const { rel, href } = this.getLinkAttr(link)
    const dynamicLink = {
      url: '',
    }

    if (!href) {
      return dynamicLink
    }

    let replaceComment: Comment | null = null
    if (this.isStylesheet(rel)) {
      return {
        url: CompletionPath(href, url),
        info: {
          code: '',
          isGlobal: this.linkIsGlobal(link),
        },
      }
    } else if (this.isOtherRel(rel)) {
      replaceComment = document.createComment(`link element with rel=${rel}${href ? ' & href=' + href : ''} removed by micro-app`)
    } else if (href) {
      // dns-prefetch preconnect modulepreload search ....
      link.setAttribute('href', CompletionPath(href, url))
    }

    return { replaceComment }
  }

  private getLinkAttr (link: HTMLLinkElement) {
    const rel = link.getAttribute('rel')
    const href = link.getAttribute('href')

    return {
      rel,
      href,
    }
  }

  private isStylesheet (rel: string | null) {
    return rel === 'stylesheet'
  }

  private linkIsGlobal (link: HTMLLinkElement) {
    return link.hasAttribute('global')
  }

  private isOtherRel (rel: string | null) {
    // preload prefetch icon ....
    return rel && ['prefetch', 'preload', 'prerender', 'icon', 'apple-touch-icon'].includes(rel)
  }
}

/**
 * fetch link succeeded, replace placeholder with style tag
 * @param url resource address
 * @param info resource link info
 * @param data code
 * @param microAppHead micro-app-head
 * @param app app
 */
export function fetchLinkSuccess (
  url: string,
  info: sourceLinkInfo,
  data: string,
  microAppHead: Element,
  app: AppInterface,
): void {
  if (info.isGlobal && !globalLinks.has(url)) {
    globalLinks.set(url, data)
  }

  const styleLink = pureCreateElement('style')
  styleLink.textContent = data
  styleLink.__MICRO_APP_LINK_PATH__ = url
  styleLink.setAttribute('data-origin-href', url)

  if (info.placeholder!.parentNode) {
    info.placeholder!.parentNode.replaceChild(scopedCSS(styleLink, app), info.placeholder!)
  } else {
    microAppHead.appendChild(scopedCSS(styleLink, app))
  }

  info.placeholder = null
  info.code = data
}

/**
 * get css from dynamic link
 * @param url link address
 * @param info info
 * @param app app
 * @param originLink origin link element
 * @param replaceStyle style element which replaced origin link
 */
export function formatDynamicLink (
  url: string,
  info: sourceLinkInfo,
  app: AppInterface,
  originLink: HTMLLinkElement,
  replaceStyle: HTMLStyleElement,
): void {
  if (app.source.links.has(url)) {
    replaceStyle.textContent = app.source.links.get(url)!.code
    scopedCSS(replaceStyle, app)
    defer(() => dispatchOnLoadEvent(originLink))
    return
  }

  if (globalLinks.has(url)) {
    const code = globalLinks.get(url)!
    info.code = code
    app.source.links.set(url, info)
    replaceStyle.textContent = code
    scopedCSS(replaceStyle, app)
    defer(() => dispatchOnLoadEvent(originLink))
    return
  }

  fetchSource(url, app.name).then((data: string) => {
    info.code = data
    app.source.links.set(url, info)
    info.isGlobal && globalLinks.set(url, data)
    replaceStyle.textContent = data
    scopedCSS(replaceStyle, app)
    dispatchOnLoadEvent(originLink)
  }).catch((err) => {
    logError(err, app.name)
    dispatchOnErrorEvent(originLink)
  })
}
