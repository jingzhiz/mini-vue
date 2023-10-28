// 一个全局变量用来存储当前激活的副作用函数
let activeEffect = null
// effect 调用栈
const effectStack = []
// WeakMap 常用于存储 key 所引用的对象 value 存在时才有价值的信息
// 当 value 被回收，key 也会被回收
// 而 Map 中，value 被回收后，key 依旧作为 Map 对象的键名被引用，不会被回收
const bucket = new WeakMap()

// 用于将副作用函数从依赖集合中移除
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    // effectFn 执行时，将其记录
    activeEffect = effectFn

    effectStack.push(effectFn)
    const result = fn()
    effectStack.pop()
    activeEffect = effectStack.at(-1)

    return result
  }

  effectFn.options = options
  // deps 用来存储当前所有和该副作用函数相关联的依赖集合
  effectFn.deps = []

  // 只用非 lazy 时执行副作用函数
  if (!options.lazy) {
    effectFn()
  }

  return effectFn
}

// 定义一个任务队列
const jobQueue = new Set()
// 创建一个 Promise 实例，用于将任务添加至微任务队列
const p = Promise.resolve()
// 表示当前是否正在刷新队列
let isFlushing = false

function flushJobs() {
  // 如果当前正在执行刷新队列则返回
  if (isFlushing) return
  isFlushing = true
  
  p.then(() => {
    // 异步里刷新队列
    jobQueue.forEach(job => job())
  }).finally(() => {
    // 队列刷新完毕后重置执行状态
    isFlushing = false
  })
}

