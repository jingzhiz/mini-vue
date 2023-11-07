const Teleport = {
  name: 'Teleport',
  // Teleport 组件特有标识
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    const { patch, patchChildren, move } = internals
    if (!n1) {
      // 获取挂载点
      const target = isString(n2.props.to) ? document.querySelector(n2.props.to) : n2.props.to
      // 将元素挂载至挂载点
      n2.children.forEach(c => patch(null, c, target, anchor))
    } else {
      patchChildren(n1, n2, container)

      // 如果前后挂载点不一致则移动
      if (n2.props.to !== n1.props.to) {
        const target = isString(n2.props.to) ? document.querySelector(n2.props.to) : n2.props.to
        n2.children.forEach(c => move(c, target))
      }
    }
  }
}