/*
  创建一个缓存对象
  key: vnode.type
  value: vnode
*/
const cache = new Map()

const KeepAlive = {
  name: 'KeepAlive',
  // KeepAlive 组件特有标识
  __isKeepAlive: true,
  props: {
    includes: RegExp,
    excludes: RegExp
  },
  setup(props, { slots }) {
    // 当前 KeepAlive 组件实例
    const instance = currentInstance

    const { move, createElement } = instance.keepAliveCtx

    // 创建隐藏元素的容器
    const storageContainer = createElement('div')

    instance._deActivate = (vnode) => {
      move(vnode, storageContainer)
    }
    instance._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }

    return () => {
      // 默认插槽就是要被渲染的组件
      let rawVnode = slots.default()

      // 如果不是组件则直接返回
      if (!isObject(rawVnode)) {
        return rawVnode
      }

      const name = rawVnode.type.name
      if (
        name &&
        (
          (props.includes && !props.includes.test(name)) ||
          (props.includes && props.excludes.test(name))
        )
      ) {
        // 不满足匹配条件的直接返回，不进行缓存操作
        return rawVnode
      }

      const cachedVnode = cache.get(rawVnode.type)
      if (cachedVnode) {
        // 如果有缓存的节点则不应该执行挂载而是激活
        rawVnode.component = cachedVnode.component
        rawVnode.keepAlive = true
      } else {
        // 否则就进行缓存
        cache.set(rawVnode.type, rawVnode)
      }

      // 添加标识，防止被渲染器卸载
      rawVnode.shouldKeepAlive = true

      // 将组件实例也添加上，便于在渲染器中访问
      rawVnode.keepAliveInstance = instance

      return rawVnode
    }
  }
}