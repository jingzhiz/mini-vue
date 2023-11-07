const nextFrame = (cb) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => cb())
  })
}

const Transition = {
  name: 'Transition',
  setup(props, { slots }) {
    return () => {
      const innerVnode = slots.default()

      innerVnode.transition = {
        beforeEnter(el) {
          el.classList.add('enter-form')
          el.classList.add('enter-active')
        },
        enter(el) {
          nextFrame(() => {
            el.classList.remove('enter-form')
            el.classList.add('enter-to')

            el.addEventListener('transitionend', () => {
              el.classList.remove('enter-to')
              el.classList.remove('enter-active')
            })
          })
        },
        leave(el, performRemove) {
          el.classList.add('leave-form')
          el.classList.add('leave-active')

          // 强制 reflow，使初始状态生效
          document.body.offsetWidth

          nextFrame(() => {
            el.classList.remove('leave-form')
            el.classList.add('leave-to')

            el.addEventListener('transitionend', () => {
              el.classList.remove('leave-to')
              el.classList.remove('leave-active')
              performRemove()
            })
          })
        }
      }

      return innerVnode
    }
  }
}