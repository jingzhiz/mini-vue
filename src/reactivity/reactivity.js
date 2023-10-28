const ITERATE_KEY = Symbol()
const TriggerType = {
  UPDATE: 'UPDATE',
  ADD: 'ADD',
  DELETE: 'DELETE'
}

// 重写数组方法
const arrayInstrumentations = {}

// 如果响应式了一个数组，数组内元素存在对象，则进行深度响应式处理
// 会导致 console.log(arr.includes(obj)) false
// 所以需要和原始值进行一次比较
const extraHandleArrayQueryMethods = ['includes', 'indexOf', 'lastIndexOf']
extraHandleArrayQueryMethods.forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function(...args) {
    let result = originMethod.apply(this, args)

    if (result === false) {
      result = originMethod.apply(this.raw, args)
    }
    return result
  }
})

// 标记变量，代表是否进行追踪
let shouldTrack = true
const extraHandleArrayModifyMethods = ['push', 'pop', 'shift', 'unshift', 'splice']
extraHandleArrayModifyMethods.forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function(...args) {
    // 在原始方法调用前禁止跟踪
    shouldTrack = false
    let result = originMethod.apply(this, args)
    shouldTrack = true
    return result
  }
})

function track(target, key) {
  if (!activeEffect || !shouldTrack) return target[key]

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

function trigger(target, key, type, value) {
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

  if (type === TriggerType.ADD && Array.isArray(target)) {
    // 取出和数组 length 相关的副作用函数
    const lengthEffects = depsMap.get('length')
    lengthEffects && lengthEffects.forEach(effectFn => {
      // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无限递归
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  // 如过目标是数组，并且修改了 length
  if (Array.isArray(target) && key === 'length') {
    depsMap.forEach((effects, key) => {
      // 修改 length 时，只有索引值大于或等于 length 属性值的元素才需要触发响应
      if (key >= value) {
        effects.forEach(effectFn => {
          // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无限递归
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
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

function createReactive(data, isShallow = false, isReadonly = false) {
  return new Proxy(data, {
    // 拦截获取操作
    get(target, key, receiver) {
      // 代理对象可以通过 raw 属性获取原始数据
      if (key === 'raw') return target

      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      
      // 如果是只读或者 key 类型为 symbol 则不进行追踪
      if (!isReadonly && typeof key !== 'symbol') {
        track(target, key)
      }

      const result = Reflect.get(target, key, receiver)

      // 如果是浅响应直接返回结果
      if (isShallow) {
        return result
      }

      // 遍历更深层次的对象
      if (typeof result === 'object' && result !== null) {
        return isReadonly ? readonly(result) : reactive(result)
      }

      return result
    },
    // 拦截 设置操作
    set(target, key, newVal, receiver) {
      if (isReadonly) {
        console.warn(`Set operation on key "${key}" failed: target is readonly`)
        return true
      }

      const oldVal = target[key]
      // 判断是修改已有值还是新增值
      const type = Array.isArray(target)
        // 如果代理目标是数组，则检测索引值是否小于数组的长度
        ? Number(key) < target.length ? TriggerType.UPDATE : TriggerType.ADD
        // 如果代理目标是对象，则检测对象上是否存在该属性
        : Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.UPDATE : TriggerType.ADD

      const result = Reflect.set(target, key, newVal, receiver)

      // 相等则说明 receiver 是 target 的代理对象
      if (target === receiver.raw) {
        // 旧值和新值不相等时触发更新
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type, newVal) 
        }
      }

      return result
    },
    // 拦截 in 操作符
    has(target, key, receiver) {
      track(target, key)

      return Reflect.get(target, key, receiver)
    },
    // 拦截 for in 遍历
    ownKeys(target) {
      // ownKeys 中只能拿到 target
      // 因为 for in 遍历时，可以很明确知道当前获取到的 key
      // 因此需要构造一个唯一的 key, 在触发响应的时候触发这个 key 的更新
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    // 拦截 delete 操作
    deleteProperty(target, key) {
      if (isReadonly) {
        console.warn(`Delete operation on key "${key}" failed: target is readonly`)
        return true
      }

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
