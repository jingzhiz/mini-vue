function renderer(vnode, container) {
  if (typeof vnode.tag === 'string') {
    mountElement(vnode, container)
  } else if (typeof vnode.tag === 'object') {
    mountComponent(vnode, container)
  }
}

function mountElement(vnode, container) {
  const { tag, props, children } = vnode

  // 使用 tag 创建同名标签
  const el = document.createElement(tag)

  // 遍历 props, 将属性或事件添加至 DOM 元素上
  for(const key in props) {
    if (/^on/.test(key)) {
      el.addEventListener(
        key.substring(2).toLocaleLowerCase(),
        props[key]
      )
    }
  }

  // 处理 children
  if (typeof children === 'string') {
    // 如果是 string, 作为文本节点处理
    el.appendChild(document.createTextNode(children))
  } else {
    // 否则就遍历 children, 递归的进行 renderer
    children.forEach(child => renderer(child, el))
  }

  container.appendChild(el)
}

function mountComponent(vnode, container) {
  // 调用组件函数，获取组件要渲染的内容
  const subtree = vnode.tag.render()

  renderer(subtree, container)
}