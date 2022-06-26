import { Plugin } from 'vite'

type Props = {
  logSlowFiles?: boolean
}

export function initialBuildTime({ logSlowFiles }: Props = {}): Plugin {
  let initialBuildTime: number | undefined
  let lastBuildTime: number | undefined

  let timeouts: Map<number, NodeJS.Timeout> = new Map()
  let buildTimeLogTimeout = 5000
  let initialBuildTimeLogged = false

  function startTimeout(time: number, cb: () => void) {
    clearTimeout(timeouts.get(time))
    timeouts.set(time, setTimeout(cb, time))
  }

  let lastPartialBuildTimeLogged = 0

  function logPatialBuildTime(deltaSec: number) {
    const floor = Math.floor(deltaSec)
    if (lastPartialBuildTimeLogged !== floor && floor % 3 === 0) {
      console.log(`  building... ${floor}s`)
      lastPartialBuildTimeLogged = floor
    }
  }

  let isDev = false

  return {
    name: 'initialBuildTime',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    buildStart() {
      if (!isDev) {
        initialBuildTime = Date.now()
      }
    },
    transform(_, id) {
      if (!isDev) {
        return
      }

      if (initialBuildTimeLogged) {
        return
      }

      lastBuildTime = Date.now()

      if (!initialBuildTime) {
        initialBuildTime = lastBuildTime
      }

      const deltaSec = (lastBuildTime - initialBuildTime) / 1000

      logPatialBuildTime(deltaSec)

      startTimeout(buildTimeLogTimeout, () => {
        if (initialBuildTime) {
          console.log(`  Initial build time:  ${deltaSec}s`)
          initialBuildTimeLogged = true
        }
      })

      if (logSlowFiles) {
        startTimeout(500, () => console.log('  +500ms ', id))
        startTimeout(1000, () => console.log('  +1000ms ', id))
      }

      return undefined
    },
    buildEnd() {
      if (isDev && !initialBuildTimeLogged) return

      clearTimeout(timeouts.get(buildTimeLogTimeout))

      if (initialBuildTime) {
        console.log(
          `\n\nInitial build time: ${(Date.now() - initialBuildTime) / 1000}s\n`,
        )
      }
    },
  }
}
