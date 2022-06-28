import { sourceScriptInfo } from '@micro-app/types'

export const MOCK_JS = 'console.log("micro-app");'
export const MOCK_INLINE_JS = 'console.log("inline js");'

export const MOCK_INLINE_URL = 'inline-xxx'
export const MOCK_JS_URL = 'https://micro-zoe.github.io/micro-app/test.js'
export const MOCK_ERROR_JS_URL = 'https://micro-zoe.github.io/micro-app/error.js'

export const MOCK_SCRIPT_SOURCE_INFO: sourceScriptInfo = {
  code: MOCK_JS,
  isExternal: true,
  isDynamic: false,
  async: false,
  defer: false,
  module: false,
}
export const MOCK_INLINE_SCRIPT_INFO: sourceScriptInfo = {
  code: MOCK_INLINE_JS,
  isExternal: false,
  isDynamic: false,
  async: false,
  defer: false,
  module: false,
}
export const MOCK_SUCCESS_SCRIPT_RESOURCE_MAP = new Map([
  [MOCK_JS_URL, MOCK_SCRIPT_SOURCE_INFO],
  [MOCK_INLINE_URL, MOCK_INLINE_SCRIPT_INFO],
])
export const MOCK_ERROR_SCRIPT_RESOURCE_MAP = new Map([
  [MOCK_ERROR_JS_URL, MOCK_SCRIPT_SOURCE_INFO],
])
export const MOCK_INLINE_SCRIPT_RESOURCE_MAP = new Map([[MOCK_INLINE_URL, MOCK_INLINE_SCRIPT_INFO]])
