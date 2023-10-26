function track(target, key) {
  if (!activeEffect) return target[key]

  /* 
    数据结构
      target: {
        key1: Set(effect1, effect2)
        key2: Set(effect3, effect4)
      }
  */

  // 将 target、key 和 effect 形成一种树状结构
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }

  // 将所有的 key 放到 map 中进行管理
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  // 把当前激活的副作用函数记录，effect 只和 target.key 相联系
  deps.add(activeEffect)

  // 添加当前 key 里关联的 deps
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  depsMap = bucket.get(target)
  if (!depsMap) return

  const effects = depsMap.get(key)

  // 新建一个 Set, 放置遍历同一个 Set 重复删除和追加
  const effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无限递归
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach(effectFn => {
    // 如果副作用函数存在调度器，则将副作用函数交给调度器执行
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

function reactive(data) {
  return new Proxy(data, {
    get(target, key) {
      // 追踪依赖
      track(target, key)

      return target[key]
    },
    set(target, key, value) {
      target[key] = value

      // 触发更新
      trigger(target, key)
    }
  })
}
