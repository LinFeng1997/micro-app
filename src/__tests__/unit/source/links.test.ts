import { AppInterface } from '@micro-app/types'
import { globalLinks, LinkParser } from '../../../source/links'
import { getAppDOM } from '../mocks/dom'
import { MOCK_APP_HTML } from '../mocks/html'
import { MOCK_APP_URL } from '../mocks/app'
import { waitFor } from '../../common/util'
import { MOCK_CSS } from '../mocks/css'
import { setupMockFetch } from '../mocks/fetch'

const setup = (mockLinksSet = true) => {
  const setLinkInfo = jest.fn()
  const linkParser = LinkParser.getInstance()
  const app = {
    name: 'app-1',
    url: MOCK_APP_URL,
    source: {
      links: new Map()
    }
  } as AppInterface

  if (mockLinksSet) { app.source.links.set = setLinkInfo }

  return {
    linkParser,
    setLinkInfo,
    app,
    ...getAppDOM(MOCK_APP_HTML),
  }
}

describe('Source Link Parser', () => {
  beforeAll(() => {
    console.error = jest.fn()
  })

  describe('extractLinkFromHtml 方法', () => {
    test('给定一个 link 元素，可以拿到链接信息，并且 link 被替换成注释', () => {
      const { linkParser, setLinkInfo, app, MOCK_APP_HEAD } = setup()
      const link = MOCK_APP_HEAD?.querySelector('link')

      linkParser.extractLinkFromHtml(link!, MOCK_APP_HEAD!, app)
      expect(setLinkInfo).toBeCalledWith(`${MOCK_APP_URL}link.css`, {
        code: '',
        isGlobal: false,
        placeholder: expect.anything()
      })

      expect(MOCK_APP_HEAD!.contains(link!)).toBeFalsy()
      expect(MOCK_APP_HEAD!.innerHTML).toContain(
        `<!--link element with href=${MOCK_APP_URL}link.css move to micro-app-head as style element-->`
      )
    })

    test('给定一个 link 元素，支持解析 preload 等属性', () => {
      const { linkParser, setLinkInfo, app, MOCK_APP_HEAD } = setup()
      const link = MOCK_APP_HEAD?.querySelector('link')
      link!.setAttribute('rel', 'preload')

      linkParser.extractLinkFromHtml(link!, MOCK_APP_HEAD!, app)
      expect(MOCK_APP_HEAD!.contains(link!)).toBeFalsy()
      expect(setLinkInfo).not.toBeCalled()
    })

    test('给定一个非常规的 link 元素，支持路径补全', () => {
      const { linkParser, setLinkInfo, app, MOCK_APP_HEAD } = setup()
      const link = MOCK_APP_HEAD?.querySelector('link')
      link!.setAttribute('rel', 'dns-prefetch')
      link!.setAttribute('href', './preload.css')

      linkParser.extractLinkFromHtml(link!, MOCK_APP_HEAD!, app)
      expect(link?.href).toBe(`${MOCK_APP_URL}preload.css`)
      expect(setLinkInfo).not.toBeCalled()
    })
  })

  describe('extractDynamicLinkFromHtml 方法', () => {
    let dynamicLink: HTMLLinkElement
    beforeEach(() => {
      dynamicLink = document.createElement('link')
      dynamicLink.setAttribute('rel', 'stylesheet')
      dynamicLink.setAttribute('href', '/dynamic.css')
    })

    test('给定一个会动态加载的 link 元素，可以拿到链接信息', () => {
      const { linkParser } = setup()

      const rst = linkParser.extractDynamicLinkFromHtml(dynamicLink, MOCK_APP_URL)
      expect(rst).toEqual({
        url: `${MOCK_APP_URL}dynamic.css`,
        info: {
          code: '',
          isGlobal: false,
        },
      })
    })

    test('给定一个会动态加载的 link 元素，如果是 preload 等类型，返回一个注释', () => {
      const { linkParser } = setup()

      dynamicLink.setAttribute('rel', 'preload')
      const rst = linkParser.extractDynamicLinkFromHtml(dynamicLink, MOCK_APP_URL)
      expect(rst.replaceComment!.data).toEqual('link element with rel=preload & href=/dynamic.css removed by micro-app')
    })

    test('给定一个会动态加载的非常规 link 元素，支持路径补全', () => {
      const { linkParser } = setup()

      dynamicLink.setAttribute('rel', 'dns-prefetch')
      dynamicLink!.setAttribute('href', './preload.css')
      linkParser.extractDynamicLinkFromHtml(dynamicLink, MOCK_APP_URL)
      expect(dynamicLink?.href).toBe(`${MOCK_APP_URL}preload.css`)
    })
  })

  describe('formatDynamicLink 方法', () => {
    let style: HTMLStyleElement
    let dynamicLink: HTMLLinkElement

    beforeEach(() => {
      style = document.createElement('style')
      dynamicLink = document.createElement('link')
      dynamicLink.setAttribute('rel', 'stylesheet')
      dynamicLink.setAttribute('href', '/dynamic.css')
    })

    test('给定一个动态 link，期望 link 被替换成一个 style 标签注入到 DOM 中去', async () => {
      global.fetch = jest.fn().mockImplementation(setupMockFetch(MOCK_CSS))
      const { app } = setup()

      LinkParser.formatDynamicLink(
        `${MOCK_APP_URL}dynamic.css`,
        { code: '', isGlobal: false },
        app,
        dynamicLink,
        style
      )

      await waitFor(() => {
        expect(global.fetch).toBeCalled()
        expect(style.textContent).toBe(MOCK_CSS)
      })
    })

    test('给定一个动态 link，之前已经加载过，期望资源从缓存中加载而不是远程', async () => {
      global.fetch = jest.fn().mockImplementation(setupMockFetch(MOCK_CSS))
      const { app } = setup(false)

      app.source.links.set(`${MOCK_APP_URL}dynamic.css`, {
        code: MOCK_CSS,
        isGlobal: false
      })

      LinkParser.formatDynamicLink(
        `${MOCK_APP_URL}dynamic.css`,
        { code: '', isGlobal: false },
        app,
        dynamicLink,
        style
      )

      expect(style.textContent).toBe(MOCK_CSS)
      expect(global.fetch).not.toBeCalled()
    })

    test('给定一个需要全局缓存的动态 link，期望资源从缓存中加载而不是远程', async () => {
      global.fetch = jest.fn().mockImplementation(setupMockFetch(MOCK_CSS))
      const { app } = setup(false)

      const key = `${MOCK_APP_URL}dynamic.css`
      globalLinks.set(key, MOCK_CSS)

      LinkParser.formatDynamicLink(
        key,
        { code: '', isGlobal: true },
        app,
        dynamicLink,
        style
      )

      expect(style.textContent).toBe(MOCK_CSS)
      expect(global.fetch).not.toBeCalled()
      expect(app.source.links.get(key)).toEqual({
        code: MOCK_CSS,
        isGlobal: true
      })
      globalLinks.clear()
    })

    test('给定一个动态 link，加载过程中网络错误，期望报错', async () => {
      global.fetch = jest.fn().mockImplementation(setupMockFetch(MOCK_CSS, true))
      const { app } = setup()

      LinkParser.formatDynamicLink(
        `${MOCK_APP_URL}dynamic.css`,
        { code: '', isGlobal: false },
        app,
        dynamicLink,
        style
      )
      const logError = jest.spyOn(console, 'error')

      await waitFor(() => {
        expect(global.fetch).toBeCalled()
        expect(logError).toBeCalled()
      })
    })
  })

  describe('fetchLinkSuccess 方法', () => {
    test('给定一个 css 字符串，期望变成一个 style 标签注入到 DOM 中去', async () => {
      const { app, MOCK_APP_HEAD } = setup()
      const info = {
        code: '',
        isGlobal: true,
        placeholder: document.createComment('placeholder for link with href=common'),
      }
      MOCK_APP_HEAD!.appendChild(info.placeholder!)

      LinkParser.fetchLinkSuccess(MOCK_APP_URL, info, MOCK_CSS, MOCK_APP_HEAD!, app)

      const style = MOCK_APP_HEAD!.querySelector('style[data-origin-href]')
      expect(style!.innerHTML).toBe(MOCK_CSS)
      expect(info.code).toBe(MOCK_CSS)
    })

    // 请求css成功后处理时，parent为空
    test('empty parentNode when fetch css success', () => {
      const microAppHead = document.createElement('micro-app-head')
      const info = { placeholder: document.createComment('link comment') } as any
      const app = { scopecss: false } as any

      LinkParser.fetchLinkSuccess(
        'http://empty.parentNode.com/test.css',
        info,
        'css-text',
        microAppHead,
        app,
      )

      expect(microAppHead.children[0] instanceof HTMLStyleElement).toBeTruthy()
    })
  })
})
