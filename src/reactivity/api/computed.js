function computed(getter) {
  let value
  // 用来标识是否需要缓存值，如果为 true 表示值已脏，需要重新计算
  let dirty = true

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      // 在调度器中将 dirty 重置为 true, 依赖改变时就能重新计算缓存
      dirty = true

      // 计算属性依赖的响应式数据变化时，手动 trigger 触发响应
      trigger(obj, 'value')
    }
  })

  const obj = {
    get value() {
      // 如果值已脏，则重新计算结果
      if (dirty) {
        value = effectFn()
        dirty = false
      }

      // 当读取 value 时，手动 track 跟踪依赖
      track(obj, 'value')

      // 返回之前的缓存
      return value
    }
  }

  return obj
}