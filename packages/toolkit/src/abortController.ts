let displayedWarning = false
export const AC =
    typeof AbortController !== 'undefined'
        ? AbortController
        : class implements AbortController {
            signal = {
                aborted: false,
                addEventListener() {},
                dispatchEvent() {
                    return false
                },
                onabort() {},
                removeEventListener() {},
                reason: undefined,
                throwIfAborted() {},
            }
            abort() {
                if (process.env.NODE_ENV !== 'production') {
                    if (!displayedWarning) {
                        displayedWarning = true
                        console.info(
                            `This platform does not implement AbortController. 
If you want to use the AbortController to react to \`abort\` events, please consider importing a polyfill like 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'.`
                        )
                    }
                }
            }
        }