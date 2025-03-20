import type { NextConfigComplete } from '../server/config-shared'
import type { Span } from '../trace'

import * as Log from './output/log'
import createSpinner from './spinner'
import isError from '../lib/is-error'
import type { Telemetry } from '../telemetry/storage'
import { EVENT_BUILD_FEATURE_USAGE } from '../telemetry/events/build'

// TODO: refactor this to account for more compiler lifecycle events
// such as beforeProductionBuild, but for now this is the only one that is needed
export async function runAfterProductionBuild({
  config,
  buildSpan,
  telemetry,
  metadata,
}: {
  config: NextConfigComplete
  buildSpan: Span
  telemetry: Telemetry
  metadata: {
    projectDir: string
    distDir: string
  }
}): Promise<void> {
  const afterProductionBuild = config.compiler.afterProductionBuild
  if (!afterProductionBuild) {
    return
  }
  telemetry.record([
    {
      eventName: EVENT_BUILD_FEATURE_USAGE,
      payload: {
        featureName: 'afterProductionBuild',
        invocationCount: 1,
      },
    },
  ])
  const afterBuildSpinner = createSpinner('Running afterProductionBuild')

  try {
    const startTime = performance.now()
    await buildSpan
      .traceChild('after-production-build')
      .traceAsyncFn(async () => {
        await afterProductionBuild(metadata)
      })
    const duration = performance.now() - startTime
    const formattedDuration = `${Math.round(duration)}ms`
    Log.event(`Completed afterProductionBuild in ${formattedDuration}`)
  } catch (err) {
    // Handle specific known errors differently if needed
    if (isError(err)) {
      Log.error(`Failed to run afterProductionBuild: ${err.message}`)
    }

    throw err
  } finally {
    afterBuildSpinner?.stop()
  }
}
