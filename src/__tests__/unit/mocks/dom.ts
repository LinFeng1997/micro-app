export function getAppDOM (html: string) {
  const MOCK_APP_ELEMENT = getMockElement(html)
  const MOCK_APP_HEAD = MOCK_APP_ELEMENT.querySelector('micro-app-head')
  const MOCK_APP_BODY = MOCK_APP_ELEMENT.querySelector('micro-app-body')

  return {
    MOCK_APP_ELEMENT,
    MOCK_APP_HEAD,
    MOCK_APP_BODY,
  }
}

function getMockElement (str: string): HTMLElement {
  const mockElement = document.createElement('div')

  mockElement.innerHTML = str

  return mockElement
}
