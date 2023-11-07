function defineAsyncComponent(options) {
  if (isFunction(options)) {
    options = {
      loader: options
    }
  }

  const { loader } = options
  let innerComp = null

  // 记录重试次数
  let retries = 0
  function load() {
    return loader()
      .catch((err) => {
        if (options.onError) {
          return new Promise((resolve, reject) => {
            const retry = () => {
              resolve(load())
              retries++
            }
            const fail = () => reject(err)
            options.onError(retry, fail, retries)
          })
        } else {
          throw err
        }
      })
  }

  // 返回一个包装组件
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const loading = ref(false)
      const error = shallowRef(null)

      let loadTimer = null
      if (options.delay) {
        loadTimer = setTimeout(() => {
          loading.value = true
        }, options.delay);
      } else {
        loading.value = true
      }

      load()
        .then((c) => {
          innerComp = c
          loaded.value = true
        })
        .catch((err) =>
          // 加载错误时记录报错信息
          error.value = err
        )
        .finally(() => {
          // 无论加载成功或失败都要清除 loading
          loading.value = false
          clearTimeout(loadTimer)
        })

      let timer = null
      if (options.timeout) {
        timer = setTimeout(() => {
          error.value = `Async component timeout out after ${options.timeout}ms.`
        }, options.timeout);
      }

      onUnmounted(() => clearTimeout(timer))

      const placeholder = { type: Comment, children: '' }

      // 加载成功后返回接收到的组件, 否则返回一个注释节点占位
      return () => {
        if (loaded.value) {
          return { type: innerComp }
        } else if (error.value && options.errorComponent) {
          // 如果用户指定了加载超时，则展示用户的 Error 组件并将错误信息作为 props 传递
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          // 如果用户指定了 loading 状态，则在 loading 时展示用户 loading 组件
          return { type: options.loadingComponent }
        }
        return placeholder
      }
    }
  }
}