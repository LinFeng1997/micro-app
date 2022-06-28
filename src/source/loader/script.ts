import { AppInterface, sourceScriptInfo } from '@micro-app/types'
import { fetchSource } from '../fetch'
import { logError, promiseStream } from '../../libs/utils'
import { globalScripts } from '../scripts'

export interface IScriptLoader {
  run (
    app: AppInterface,
    successCb: CallableFunction,
    finallyCb: CallableFunction
  ): void
}

export class ScriptLoader implements IScriptLoader {
  private static instance: ScriptLoader;
  public static getInstance (): ScriptLoader {
    if (!this.instance) {
      this.instance = new ScriptLoader()
    }
    return this.instance
  }

  /**
   * Get script remote resources
   * @param app app
   * @param successCb success callback
   * @param finallyCb finally callback
   */
  public run (
    app: AppInterface,
    successCb: CallableFunction,
    finallyCb: CallableFunction
  ): void {
    const {
      fetchScriptPromise,
      fetchScriptPromiseInfo
    } = this.getScriptData(app)

    if (fetchScriptPromise.length) {
      promiseStream<string>(fetchScriptPromise, (res: {data: string, index: number}) => {
        const [url, info] = fetchScriptPromiseInfo[res.index]
        successCb(url, info, res.data)
      }, (err: {error: Error, index: number}) => {
        logError(err, app.name)
      }, () => {
        finallyCb()
      })
    } else {
      finallyCb()
    }
  }

  private getScriptData (app: AppInterface) {
    const scriptEntries: Array<[string, sourceScriptInfo]> = Array.from(app.source.scripts.entries())
    const fetchScriptPromise: Promise<string>[] = []
    const fetchScriptPromiseInfo: Array<[string, sourceScriptInfo]> = []

    for (const [url, info] of scriptEntries) {
      if (info.isExternal) {
        const globalScriptText = globalScripts.get(url)
        if (globalScriptText) {
          info.code = globalScriptText
        } else if ((!info.defer && !info.async) || app.isPrefetch) {
          fetchScriptPromise.push(fetchSource(url, app.name))
          fetchScriptPromiseInfo.push([url, info])
        }
      }
    }

    return {
      fetchScriptPromise,
      fetchScriptPromiseInfo
    }
  }
}
