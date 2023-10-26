function watch(source, cb, options = {}) {
  let getter
  if(typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  // 用来处理过期回调结果
  let cleanup
  function onInvalidate(fn) {
    cleanup = fn
  }

  let oldVal, newVal
  const job = () => {
    // 在调度器中执行副作用函数，得到最新的数据
    newVal = effectFn()
    // 每次在回调函数执行前，先调用过期回调
    if (cleanup) {
      cleanup()
    }
    cb(newVal, oldVal, onInvalidate)
    // 回调函数执行完后更新旧值
    oldVal = newVal
  }
  const effectFn = effect(
    // 深度遍历数据源的每一个子属性
    () => getter(),
    {
      lazy: true,
      scheduler: () => {
        // 当为 post 时，支持异步调用
        if (options.flush === 'post') {
          const p = Promise.resolve()
          p.then(job)
        } else {
          job()
        }
      }
    }
  )

  // 立即执行一次回调
  if (options.immediate) {
    job()
  } else {
    // 手动调用副作用函数，拿到的值是旧值
    oldVal = effectFn()
  }
}

function traverse(value, seen = new Set()) {
  // 如果要被读取的值是原始值，获取已经被读取过了直接跳过
  if (typeof value !== 'object' || value === null || seen.has(value)) return

  // 将读取的数据添加到 Set 中记录
  seen.add(value)
  for(const key in value) {
    // 递归遍历每一个子属性
    traverse(value[key], seen)
  }

  return seen
}