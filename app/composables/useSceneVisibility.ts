/** Stop decorative motion when its element or browser tab is not visible. */
export function useSceneVisibility(target: Ref<HTMLElement | undefined>) {
  const visible = ref(true)
  let inViewport = true
  let observer: IntersectionObserver | undefined
  function update() {
    visible.value = inViewport && !document.hidden
  }
  onMounted(() => {
    update()
    observer = new IntersectionObserver(([entry]) => {
      inViewport = !!entry?.isIntersecting
      update()
    })
    if (target.value) observer.observe(target.value)
    document.addEventListener('visibilitychange', update)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    document.removeEventListener('visibilitychange', update)
  })
  return readonly(visible)
}
