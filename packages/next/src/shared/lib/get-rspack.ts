import { warnOnce } from '../../build/output/log'

export function getRspackCore() {
  warnRspack()
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require('@rspack/core')
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '@rspack/core is not available. Please make sure `next-rspack` is correctly installed.'
      )
    }

    throw e
  }
}

export function getRspackReactRefresh() {
  warnRspack()
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require('@rspack/plugin-react-refresh')
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '@rspack/plugin-react-refresh is not available. Please make sure `next-rspack` is correctly installed.'
      )
    }

    throw e
  }
}

function warnRspack() {
  warnOnce(
    'Rspack support for Next.js is a community effort and is experimental. Help improve Next.js and Rspack by providing feedback at https://github.com/vercel/next.js/discussions/77800'
  )
}
