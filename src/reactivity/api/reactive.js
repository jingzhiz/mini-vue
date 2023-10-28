const reactiveMap = new Map()

function reactive (object) {
  // 优先通过原始对象寻找已有的代理对象
  const existProxy = reactiveMap.get(object)
  if (existProxy) return existProxy
  const proxy = createReactive(object)
  // 缓存代理，避免重复创建
  reactiveMap.set(object, proxy)
  return proxy
}

function shallowReactive (object) {
  return createReactive(object, true)
}