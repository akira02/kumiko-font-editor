import { useCallback, useEffect, useRef } from 'react'

export function usePresetScrollMask(
  activeTabIndex: number,
  presetCount: number
) {
  const presetScrollRef = useRef<HTMLDivElement | null>(null)
  const updatePresetScrollMask = useCallback(() => {
    const scrollContainer = presetScrollRef.current
    if (!scrollContainer) {
      return
    }

    const maxScrollTop =
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    const canScrollDown = maxScrollTop - scrollContainer.scrollTop > 1
    const canScrollUp = scrollContainer.scrollTop > 1
    const topMask = canScrollUp ? 'transparent, black 72px' : 'black 0'
    const bottomMask = canScrollDown
      ? 'black calc(100% - 72px), transparent'
      : 'black 100%'
    const maskImage = `linear-gradient(to bottom, ${topMask}, ${bottomMask})`

    if (
      scrollContainer.style.getPropertyValue('--preset-scroll-mask') !==
      maskImage
    ) {
      scrollContainer.style.setProperty('--preset-scroll-mask', maskImage)
    }
  }, [])

  useEffect(() => {
    if (activeTabIndex !== 0) {
      return
    }

    updatePresetScrollMask()
    const scrollContainer = presetScrollRef.current
    if (!scrollContainer) {
      return
    }

    const resizeObserver = new ResizeObserver(updatePresetScrollMask)
    resizeObserver.observe(scrollContainer)
    window.addEventListener('resize', updatePresetScrollMask)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePresetScrollMask)
    }
  }, [activeTabIndex, presetCount, updatePresetScrollMask])

  return { presetScrollRef, updatePresetScrollMask }
}
