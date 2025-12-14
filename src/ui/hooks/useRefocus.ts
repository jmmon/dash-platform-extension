import { createRef, useRef } from "react";

const OPTS = { focus: true, select: true };

export default function useRefocus(): {
  elRef: React.RefObject<HTMLInputElement>
  refocus: (opts?: typeof OPTS) => void
}
export default function useRefocus<K extends string>(...keynames: K[]): {
  elRefs: React.RefObject<Record<string, React.RefObject<HTMLInputElement>>>
  refocus: (key: K, opts?: typeof OPTS) => void
}
export default function useRefocus<K extends string>(...keyNames: K[]) {
  const elRefs = useRef<Record<string, React.RefObject<HTMLInputElement | null>>>({
    'default': createRef()
  })

  const refocus = (key: K = 'default' as K, opts: Partial<typeof OPTS> = OPTS) => {
    opts = { ...OPTS, ...opts }
    opts.focus && elRefs.current[key].current?.focus()
    opts.select && elRefs.current[key].current?.select()
  }

  if (!keyNames.length) return { elRef: elRefs.current['default'], refocus }

  elRefs.current = Object.fromEntries(
    keyNames.map(key => [key, elRefs.current[key] || createRef()])
  )
  return { elRefs, refocus }
}
