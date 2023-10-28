const ITERATE_KEY = Symbol()
const TriggerType = {
  UPDATE: 'UPDATE',
  ADD: 'ADD',
  DELETE: 'DELETE'
}

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

function trigger(target, key, type) {
  depsMap = bucket.get(target)
  if (!depsMap) return

  // 获取和 key 相关联的副作用函数
  const effects = depsMap.get(key)

  // 新建一个 Set, 放置遍历同一个 Set 重复删除和追加
  const effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无限递归
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  // 增加/删除属性都会导致 key 数量的变化，影响 for in 循环次数
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    // 获取和 ITERATE_KEY 相关联的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)
    iterateEffects && iterateEffects.forEach(effectFn => {
      // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无限递归
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

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
    // 拦截获取操作
    get(target, key, receiver) {
      console.log('get')
      // 追踪依赖
      track(target, key)

      return Reflect.get(target, key, receiver)
    },
    // 拦截 设置操作
    set(target, key, value, receiver) {
      console.log('set')
      const oldVal = target[key]
      // 判断是修改已有值还是新增值
      const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.UPDATE : TriggerType.ADD

      const newVal = Reflect.set(target, key, value, receiver)

      // 旧值和新值不相等时触发更新
      if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
        trigger(target, key, type) 
      }

      return newVal
    },
    // 拦截 in 操作符
    has(target, key, receiver) {
      console.log('has')

      track(target, key)

      return Reflect.get(target, key, receiver)
    },
    // 拦截 for in 遍历
    ownKeys(target) {
      console.log('onwKeys')
      // ownKeys 中只能拿到 target
      // 因为 for in 遍历时，可以很明确知道当前获取到的 key
      // 因此需要构造一个唯一的 key, 在触发响应的时候触发这个 key 的更新
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    // 拦截 delete 操作
    deleteProperty(target, key) {
      console.log('delete')
      const hasKey = Object.prototype.hasOwnProperty.call(target, key)

      const result = Reflect.deleteProperty(target, key)

      if (result && hasKey) {
        // 只有删除成功， 并且删除的值是对象自己本身属性时才触发更新
        trigger(target, key, TriggerType.DELETE)
      }

      return result
    }
  })
}
