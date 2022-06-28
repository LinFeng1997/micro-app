import { AppInterface } from '@micro-app/types'

import { waitFor } from '../../../common/util'
import { setupMockFetch } from '../../mocks/fetch'
import { ScriptLoader } from '../../../../source/loader/script'
import { MOCK_APP_URL } from '../../mocks/app'
import {
  MOCK_JS, MOCK_INLINE_JS,
  MOCK_JS_URL, MOCK_ERROR_JS_URL,
  MOCK_SUCCESS_SCRIPT_RESOURCE_MAP, MOCK_SCRIPT_SOURCE_INFO, MOCK_ERROR_SCRIPT_RESOURCE_MAP, MOCK_INLINE_SCRIPT_RESOURCE_MAP
} from '../../mocks/script'
import { globalScripts } from '../../../../source/scripts'

const setup = (code = MOCK_JS) => {
  const mockFetch = (url: string) => {
    if (url === MOCK_ERROR_JS_URL) {
      return setupMockFetch(code, true)()
    }
    return setupMockFetch(code)()
  }
  global.fetch = jest.fn().mockImplementation(mockFetch)
  const scriptLoader = ScriptLoader.getInstance()

  const successCb = jest.fn()
  const errorCb = jest.fn()
  const finallyCb = jest.fn()

  return {
    scriptLoader,
    successCb,
    errorCb,
    finallyCb,
  }
}

describe('ScriptLoader', () => {
  beforeAll(() => {
    console.error = jest.fn()
  })

  test('给定一个 scripts，正常执行成功回调和最终回调', async () => {
    const { scriptLoader, successCb, finallyCb } = setup()
    const app = {
      name: 'app-1',
      url: MOCK_APP_URL,
      source: {
        scripts: MOCK_SUCCESS_SCRIPT_RESOURCE_MAP
      }
    } as AppInterface

    scriptLoader.run(app, successCb, finallyCb)

    await waitFor(() => {
      expect(global.fetch).toBeCalledWith(MOCK_JS_URL, {})
      expect(successCb).toBeCalledWith(MOCK_JS_URL, MOCK_SCRIPT_SOURCE_INFO, MOCK_JS)
      expect(global.fetch).not.toBeCalledWith(MOCK_INLINE_JS, {})
      expect(finallyCb).toBeCalled()
    })
  })

  test('预加载情况，给定一个 scripts，正常执行成功回调和最终回调', async () => {
    const { scriptLoader, successCb, finallyCb } = setup()
    const app = {
      name: 'app-1',
      url: MOCK_APP_URL,
      source: {
        scripts: MOCK_SUCCESS_SCRIPT_RESOURCE_MAP
      },
      isPrefetch: true
    } as AppInterface
    scriptLoader.run(app, successCb, finallyCb)

    await waitFor(() => {
      expect(global.fetch).toBeCalledWith(MOCK_JS_URL, {})
      expect(successCb).toBeCalledWith(MOCK_JS_URL, MOCK_SCRIPT_SOURCE_INFO, MOCK_JS)
      expect(finallyCb).toBeCalled()
    })
  })

  test('给定的 scripts 中有一个会发生网络错误，会报错和执行最终回调', async () => {
    const { scriptLoader, successCb, finallyCb } = setup()
    const app = {
      name: 'app-1',
      url: MOCK_APP_URL,
      source: {
        scripts: MOCK_ERROR_SCRIPT_RESOURCE_MAP
      },
      isPrefetch: true
    } as AppInterface
    const logError = jest.spyOn(console, 'error')

    scriptLoader.run(app, successCb, finallyCb)

    await waitFor(() => {
      expect(logError).toBeCalled()
      expect(finallyCb).toBeCalled()
    })
  })

  test('给定的 scripts，没有执行 fetch，直接调用最终回调', async () => {
    const { scriptLoader, successCb, finallyCb } = setup()
    const app = {
      name: 'app-1',
      url: MOCK_APP_URL,
      source: {
        scripts: MOCK_INLINE_SCRIPT_RESOURCE_MAP
      },
      isPrefetch: true
    } as AppInterface
    scriptLoader.run(app, successCb, finallyCb)

    await waitFor(() => {
      expect(successCb).not.toBeCalled()
      expect(global.fetch).not.toBeCalled()
      expect(finallyCb).toBeCalled()
    })
  })

  // 缓存
  test('给定的 scripts，在缓存中有记录，不执行 fetch，直接调用最终回调', async () => {
    const { scriptLoader, successCb, finallyCb } = setup()
    const app = {
      name: 'app-1',
      url: MOCK_APP_URL,
      source: {
        scripts: MOCK_SUCCESS_SCRIPT_RESOURCE_MAP
      }
    } as AppInterface
    globalScripts.set(MOCK_JS_URL, MOCK_SCRIPT_SOURCE_INFO.code)

    scriptLoader.run(app, successCb, finallyCb)

    await waitFor(() => {
      expect(global.fetch).not.toBeCalled()
      expect(successCb).not.toBeCalled()
      expect(finallyCb).toBeCalled()
      globalScripts.clear()
    })
  })
})
