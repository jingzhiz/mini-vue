// 使用生成渲染器函数，可以生成不同类型的渲染器
function createRenderer(options = {}) {
  // 针对不同平台的统一 API 风格处理
  const {
    createElement,
    setElementText,
    insert,
    patchProps
  } = options

  // 挂载普通标签元素
  function mountElement(vnode, container) {
    const { type, props, children } = vnode
  
    // 使用 type 创建同名标签, 并让 vnode.el 指向真实 dom 元素
    const el = vnode.el = createElement(type)
  
    // 遍历 props, 将属性或事件添加至 DOM 元素上
    if (vnode.props) {
      for(const key in props) {
        patchProps(el, key, null, props[key])
      }
    }

    // 处理 children
    if (isString(children)) {
      // 如果是 string, 作为文本节点处理
      setElementText(el, children)
    } else if (isArray(children)) {
      // 如果是数组就遍历 children, 调用 patch 进行挂载
      children.forEach(child => patch(null, child, el))
    }

    insert(el, container)
  }

  // 更新普通标签元素
  function patchElement(n1, n2) {

  }
  
  // 挂载组件
  function mountComponent(vnode, container) {
    // 调用组件函数，获取组件要渲染的内容
    const subtree = vnode.type.render()
  
    render(subtree, container)
  }

  function unmount(vnode) {
    const parent = vnode.el.parentNode
    if (parent) parent.removeChild(vnode.el)
  }

  function patch(n1, n2, container) {
    // 如果是不同的标签元素，则直接先卸载之前的元素
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }

    // 如过是相同的标签元素
    const { type } = n2

    if (isString(type)) {
      if (!n1) {
        // 挂载
        mountElement(n2, container)
      } else {
        // 更新
        patchElement(n1, n2)
      }
    } else if (isObject(type)) {
      // mountComponent()
    }

  }

  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      // 卸载操作
      if (container._vnode) {
        unmount(container._vnode)
      }
    }

    container._vnode = vnode
  }

  return { render }
}

// 生成渲染函数，将浏览器环境的 API 传至生成渲染器函数中
const { render } = createRenderer({
  createElement(type) {
    return document.createElement(type)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  // 针对 property 和 attribute 做不同的处理
  patchProps(el, key, prevValue, nextValue) {
    // on 开头表示是事件
    if (/^on/.test(key)) {
      let invokers = el._vei || (el._vei = {})
      const eventName = key.substring(2).toLocaleLowerCase()
      let invoker = invokers[key]
      if (nextValue) {
        // 如果没有 invoker, 则伪造一个 invoker 缓存到 el._vei
        if (!invoker) {
          invoker = el._vei[key] = (e) => {
            // 当伪造的事件处理函数执行时，执行真正的函数
            if (isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e))
            } else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          el.addEventListener(eventName, invoker)
        }
      } else if (invoker) {
        // 移除之前绑定的事件处理函数
        el.removeEventListener(eventName, invoker)
      }
    } else if (key === 'class') {
      // 对 class 属性进行特殊处理
      const value = normalizeClass(nextValue)
      el.className = value || ''
    } else if (key === 'style') {
      // 对 style 属性进行特殊处理
      const value = normalizeStyle(nextValue)
      if (isString(value)) {
        el.style.cssText = value
      } else if (isObject(value)) {
        Object.entries(value).forEach(([k, v]) => {
          el.style[k] = v
        })
      }
    } else if (shouldSetAsProps(el, key, nextValue)) {
      if (isBoolean(el[key]) && value === '') {
        el[key] = true
      } else {
        el[key] = nextValue
      }
    } else {
      el.setAttribute(key, nextValue)
    }
  }
})